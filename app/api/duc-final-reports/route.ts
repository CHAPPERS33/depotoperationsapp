
// app/api/duc-final-reports/route.ts
import { NextResponse } from 'next/server';
import type { 
    DUCFinalReport, FailedRound, SegregatedParcel, DUCReportAttachment, 
    MissingParcelDUCReportContext, ApiResponse 
} from '../../../types';
import { query, getClient } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload';

export async function GET(_request: Request) {
  try {
    const reports = await query<any>(`
      SELECT 
        dfr.*,
        tm.name as submitted_by_name,
        sd.name as sub_depot_name,
        du.name as delivery_unit_name,
        COALESCE(
          (SELECT json_agg(fr.*) FROM duc_failed_rounds fr WHERE fr.duc_final_report_id = dfr.id),
          '[]'::json
        ) as failed_rounds,
        COALESCE(
          (SELECT json_agg(json_build_object('id', sp.id, 'duc_final_report_id', sp.duc_final_report_id, 'barcode', sp.barcode, 'client_id', sp.client_id, 'client_name', c.name, 'count', sp.count)) 
           FROM duc_segregated_parcels sp JOIN clients c ON sp.client_id = c.id
           WHERE sp.duc_final_report_id = dfr.id),
          '[]'::json
        ) as segregated_parcels,
        COALESCE(
          (SELECT json_agg(att.*) FROM duc_report_attachments att WHERE att.duc_final_report_id = dfr.id),
          '[]'::json
        ) as attachments
      FROM duc_final_reports dfr
      JOIN team_members tm ON dfr.submitted_by_team_member_id = tm.id
      LEFT JOIN sub_depots sd ON dfr.sub_depot_id = sd.id
      LEFT JOIN delivery_units du ON dfr.delivery_unit_id = du.id
      ORDER BY dfr.submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<DUCFinalReport[]>>({ data: reports, status: 200 });
  } catch (error: any) {
    console.error('GET /api/duc-final-reports Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch DUC final reports', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  const dbClient = await getClient();
  try {
    const formData = await __request.formData();
    
    const date = formData.get('date') as string;
    const submittedByTeamMemberId = formData.get('submitted_by_team_member_id') as string;
    const subDepotIdStr = formData.get('sub_depot_id') as string | null;
    const deliveryUnitId = formData.get('delivery_unit_id') as string | null;
    const totalReturnsStr = formData.get('total_returns') as string;
    const notes = formData.get('notes') as string | null;
    const failedRoundsJson = formData.get('failed_rounds') as string; 
    const segregatedParcelsJson = formData.get('segregated_parcels') as string; 
    const missingParcelsSummaryJson = formData.get('missing_parcels_summary') as string; 

    if (!date || !submittedByTeamMemberId || !totalReturnsStr || !missingParcelsSummaryJson) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for DUC final report.', status: 400 });
    }
    const subDepotId = subDepotIdStr ? parseInt(subDepotIdStr, 10) : null;
    const totalReturns = parseInt(totalReturnsStr, 10);
    const failedRounds: Omit<FailedRound, 'id' | 'duc_final_report_id'>[] = JSON.parse(failedRoundsJson);
    // The client sends {barcode, client (name), count}
    const segregatedParcelsInput: Array<{barcode: string, client: string, count: number}> = JSON.parse(segregatedParcelsJson);
    const missingParcelsSummary: DUCFinalReport['missing_parcels_summary'] = JSON.parse(missingParcelsSummaryJson);

    const reportId = `DUC-${date}-${subDepotId || deliveryUnitId || 'GLOBAL'}-${Date.now().toString().slice(-5)}`;

    await dbClient.query('BEGIN');

    const reportResult = await dbClient.query<DUCFinalReport>(
      `INSERT INTO duc_final_reports (id, date, sub_depot_id, delivery_unit_id, submitted_by_team_member_id, submitted_at, total_returns, notes, missing_parcels_summary)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8) RETURNING *`,
      [reportId, date, subDepotId, deliveryUnitId, submittedByTeamMemberId, totalReturns, notes, JSON.stringify(missingParcelsSummary)]
    );
    const newReport = reportResult.rows[0];

    const savedFailedRounds: FailedRound[] = [];
    for (const fr of failedRounds) {
      const frResult = await dbClient.query<FailedRound>(
        `INSERT INTO duc_failed_rounds (duc_final_report_id, round_id, sub_depot_id, drop_number, comments)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [reportId, fr.round_id, fr.sub_depot_id, fr.drop_number, fr.comments]
      );
      savedFailedRounds.push(frResult.rows[0]);
    }
    newReport.failed_rounds = savedFailedRounds;

    const savedSegregatedParcels: SegregatedParcel[] = [];
    for (const sp of segregatedParcelsInput) { // Use segregatedParcelsInput which has client name
      const clientRes = await dbClient.query<{id: number}>('SELECT id FROM clients WHERE name = $1 LIMIT 1', [sp.client]);
      if (clientRes.rows.length === 0) {
         await dbClient.query('ROLLBACK');
         return NextResponse.json<ApiResponse>({ error: `Client '${sp.client}' for segregated parcel not found.`, status: 400 });
      }
      const clientId = clientRes.rows[0].id;
      const spResult = await dbClient.query<SegregatedParcel>(
        `INSERT INTO duc_segregated_parcels (duc_final_report_id, barcode, client_id, count)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [reportId, sp.barcode, clientId, sp.count]
      );
      savedSegregatedParcels.push({...spResult.rows[0], client_name: sp.client}); // Add client_name back for response
    }
    newReport.segregated_parcels = savedSegregatedParcels;

    const uploadedAttachments: DUCReportAttachment[] = [];
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith('attachments')) {
        files.push(value);
      }
    });

    for (const file of files) {
        const uploadedFile = await handleFileUpload(file, 'duc_reports', reportId);
        const attachmentResult = await dbClient.query<DUCReportAttachment>(
          `INSERT INTO duc_report_attachments (duc_final_report_id, file_name, file_path, public_url, mime_type, file_size_bytes, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
          [reportId, uploadedFile.fileName, uploadedFile.filePath, uploadedFile.publicUrl, uploadedFile.mimeType, uploadedFile.size]
        );
        uploadedAttachments.push(attachmentResult.rows[0]);
    }
    newReport.attachments = uploadedAttachments;

    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<DUCFinalReport>>({ data: newReport, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/duc-final-reports Error:', error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create DUC final report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
