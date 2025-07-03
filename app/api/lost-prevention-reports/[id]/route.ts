// app/api/lost-prevention-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { LostPreventionReport, LostPreventionReportAttachment, ApiResponse } from '../../../../types';
import { query  } from '../../../../lib/db';
 

interface RouteParams {
  params: { id: string };
}

interface LPRRawDBRow extends Omit<LostPreventionReport, 'round_ids' | 'attachments'> {
  round_ids: string[]; 
  attachments: LostPreventionReportAttachment[];
  submitted_by_name?: string;
  courier_name?: string;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<LPRRawDBRow>(`
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
      WHERE lpr.id = $1
    `, [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Lost Prevention Report not found', status: 404 });
    }
    const report : LostPreventionReport = {...result[0], round_ids: result[0].round_ids || [], attachments: result[0].attachments || []};
    return NextResponse.json<ApiResponse<LostPreventionReport>>({ data: report, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/lost-prevention-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch report', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const formData = await _request.formData();
    const existingReport = await dbClient.query<LostPreventionReport>('SELECT * FROM duc_lost_prevention_reports WHERE id = $1', [id]);
    if (existingReport.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json<ApiResponse<null>>({ error: 'Report not found for update.', status: 404 });
    }

    await dbClient.query('BEGIN');
    
    // Simple fields update
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let queryIndex = 1;

    const fields = {
        date_of_incident: formData.get('date_of_incident') as string,
        submitted_by_team_member_id: formData.get('submitted_by_team_member_id') as string,
        courier_id: formData.get('courier_id') as string,
        incident_description: formData.get('incident_description') as string,
        cctv_viewed: formData.get('cctv_viewed') === 'true',
        cctv_details: formData.get('cctv_details') as string | null,
        van_search_conducted: formData.get('van_search_conducted') === 'true',
        van_search_findings: formData.get('van_search_findings') as string | null,
        action_taken: formData.get('action_taken') as string | null,
        police_report_number: formData.get('police_report_number') as string | null,
        status: formData.get('status') as LostPreventionReport['status'],
        comments: formData.get('comments') as string | null,
    };
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
            updateFields.push(`${key} = $${queryIndex++}`);
            updateValues.push(value);
        }
    }
    if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        await dbClient.query(`UPDATE duc_lost_prevention_reports SET ${updateFields.join(', ')} WHERE id = $${queryIndex}`, updateValues);
    }

    // Round IDs update
    const round_ids_json = formData.get('round_ids') as string | null;
    if (round_ids_json) {
        const round_ids: string[] = JSON.parse(round_ids_json);
        await dbClient.query('DELETE FROM duc_lost_prevention_report_rounds WHERE lost_prevention_report_id = $1', [id]);
        for (const roundId of round_ids) {
            await dbClient.query('INSERT INTO duc_lost_prevention_report_rounds (lost_prevention_report_id, round_id) VALUES ($1, $2)', [id, roundId]);
        }
    }

    // Attachments update
    const cctvFile = formData.get('cctvFile') as File | null;
    const vanSearchFile = formData.get('vanSearchFile') as File | null;
    const existingCctvAttachmentId = formData.get('existingCctvAttachmentId') as string | null;
    const existingVanSearchAttachmentId = formData.get('existingVanSearchAttachmentId') as string | null;

    if (cctvFile) {
        if (existingCctvAttachmentId) { /* Delete old, then add new logic */ }
        const uploaded = await handleFileUpload(cctvFile, 'lost_prevention_reports', id);
        await dbClient.query(`INSERT INTO duc_lost_prevention_report_attachments (lost_prevention_report_id, file_name, file_path, public_url, description, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, uploaded.fileName, uploaded.filePath, uploaded.publicUrl, 'CCTV footage', uploaded.mimeType, uploaded.size]);
    }
    if (vanSearchFile) {
        if (existingVanSearchAttachmentId) { /* Delete old, then add new logic */ }
        const uploaded = await handleFileUpload(vanSearchFile, 'lost_prevention_reports', id);
        await dbClient.query(`INSERT INTO duc_lost_prevention_report_attachments (lost_prevention_report_id, file_name, file_path, public_url, description, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, uploaded.fileName, uploaded.filePath, uploaded.publicUrl, 'Van search photo', uploaded.mimeType, uploaded.size]);
    }
    
    await dbClient.query('COMMIT');
    
    // Re-fetch the updated report with all details
    const updatedReportResult = await GET(request, { params });
    return updatedReportResult;


  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/lost-prevention-reports/${id} Error:`, error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse<null>>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    const attachments = await dbClient.query<LostPreventionReportAttachment>('SELECT file_path FROM duc_lost_prevention_report_attachments WHERE lost_prevention_report_id = $1', [id]);
    for (const att of attachments.rows) {
      await deleteUploadedFileByRelativePath(att.file_path);
    }
    await dbClient.query('DELETE FROM duc_lost_prevention_report_attachments WHERE lost_prevention_report_id = $1', [id]);
    await dbClient.query('DELETE FROM duc_lost_prevention_report_rounds WHERE lost_prevention_report_id = $1', [id]);
    const result = await dbClient.query('DELETE FROM duc_lost_prevention_reports WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse<null>>({ error: 'Lost Prevention Report not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/lost-prevention-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}