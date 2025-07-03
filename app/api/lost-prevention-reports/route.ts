// app/api/lost-prevention-reports/route.ts
import { NextResponse } from 'next/server';
import type { LostPreventionReport, LostPreventionReportAttachment, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload';

export async function GET(_request: Request) {
  try {
    const reports = await query<any>(`
      SELECT 
        lpr.*,
        tm.name as submitted_by_name,
        c.name as courier_name,
        COALESCE(
          (SELECT json_agg(att.*) FROM duc_lost_prevention_report_attachments att WHERE att.lost_prevention_report_id = lpr.id),
          '[]'::json
        ) as attachments,
        COALESCE(
          (SELECT json_agg(lprr.round_id) FROM duc_lost_prevention_report_rounds lprr WHERE lprr.lost_prevention_report_id = lpr.id),
          '[]'::json
        ) as round_ids 
      FROM duc_lost_prevention_reports lpr
      JOIN team_members tm ON lpr.submitted_by_team_member_id = tm.id
      JOIN couriers c ON lpr.courier_id = c.id
      ORDER BY lpr.submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<LostPreventionReport[]>>({ data: reports.map(r => ({...r, round_ids: r.round_ids || [], attachments: r.attachments || []})), status: 200 });
  } catch (error: any) {
    console.error('GET /api/lost-prevention-reports Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch lost prevention reports', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  const dbClient = await getClient();
  try {
    const formData = await __request.formData();
    
    const date_of_incident = formData.get('date_of_incident') as string;
    const submitted_by_team_member_id = formData.get('submitted_by_team_member_id') as string;
    const courier_id = formData.get('courier_id') as string;
    const incident_description = formData.get('incident_description') as string;
    const cctv_viewed = formData.get('cctv_viewed') === 'true';
    const cctv_details = formData.get('cctv_details') as string | null;
    const van_search_conducted = formData.get('van_search_conducted') === 'true';
    const van_search_findings = formData.get('van_search_findings') as string | null;
    const action_taken = formData.get('action_taken') as string | null;
    const police_report_number = formData.get('police_report_number') as string | null;
    const status = formData.get('status') as LostPreventionReport['status'];
    const comments = formData.get('comments') as string | null;
    const round_ids_json = formData.get('round_ids') as string; // Expecting JSON string array

    const cctvFile = formData.get('cctvFile') as File | null;
    const vanSearchFile = formData.get('vanSearchFile') as File | null;

    if (!date_of_incident || !submitted_by_team_member_id || !courier_id || !incident_description || !status || !round_ids_json) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Missing required fields for lost prevention report.', status: 400 });
    }
    const round_ids: string[] = JSON.parse(round_ids_json);

    const reportId = `LPR-${date_of_incident}-${courier_id}-${Date.now().toString().slice(-5)}`;

    await dbClient.query('BEGIN');

    const reportResult = await dbClient.query<LostPreventionReport>(
      `INSERT INTO duc_lost_prevention_reports (id, date_of_incident, submitted_by_team_member_id, submitted_at, courier_id, incident_description, cctv_viewed, cctv_details, van_search_conducted, van_search_findings, action_taken, police_report_number, status, comments)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        reportId, date_of_incident, submitted_by_team_member_id, courier_id, incident_description,
        cctv_viewed, cctv_details, van_search_conducted, van_search_findings, action_taken, police_report_number, status, comments
      ]
    );
    const newReport = reportResult.rows[0];
    newReport.round_ids = [];
    newReport.attachments = [];

    for (const roundId of round_ids) {
        await dbClient.query(
          'INSERT INTO duc_lost_prevention_report_rounds (lost_prevention_report_id, round_id) VALUES ($1, $2)',
          [reportId, roundId]
        );
        newReport.round_ids.push(roundId);
    }
    
    if (cctvFile) {
      const uploaded = await handleFileUpload(cctvFile, 'lost_prevention_reports', reportId);
      const attResult = await dbClient.query<LostPreventionReportAttachment>(
          `INSERT INTO duc_lost_prevention_report_attachments (lost_prevention_report_id, file_name, file_path, public_url, description, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [reportId, uploaded.fileName, uploaded.filePath, uploaded.publicUrl, 'CCTV footage', uploaded.mimeType, uploaded.size]
      );
      newReport.attachments.push(attResult.rows[0]);
    }
    if (vanSearchFile) {
      const uploaded = await handleFileUpload(vanSearchFile, 'lost_prevention_reports', reportId);
      const attResult = await dbClient.query<LostPreventionReportAttachment>(
           `INSERT INTO duc_lost_prevention_report_attachments (lost_prevention_report_id, file_name, file_path, public_url, description, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [reportId, uploaded.fileName, uploaded.filePath, uploaded.publicUrl, 'Van search photo', uploaded.mimeType, uploaded.size]
      );
       newReport.attachments.push(attResult.rows[0]);
    }

    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<LostPreventionReport>>({ data: newReport, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/lost-prevention-reports Error:', error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse<null>>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create lost prevention report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}