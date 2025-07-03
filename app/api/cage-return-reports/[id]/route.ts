
// app/api/cage-return-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { CageReturnReport, NonReturnedCageDetail, ApiResponse } from '../../../../types';
import { query  } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

interface CageReturnReportRawDBRow extends Omit<CageReturnReport, 'non_returned_cages'> {
  non_returned_cages: NonReturnedCageDetail[]; // Assuming pg driver parses JSONB array to JS array
  submitted_by_name?: string;
  sub_depot_name?: string;
}


export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const reportResult = await query<CageReturnReportRawDBRow>(`
      SELECT 
        crr.*,
        tm.name as submitted_by_name,
        sd.name as sub_depot_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', nrc.id,
            'cage_return_report_id', nrc.cage_return_report_id,
            'round_id', nrc.round_id,
            'courier_id', nrc.courier_id,
            'courier_name', c.name,
            'reason', nrc.reason,
            'reported_at', nrc.reported_at,
            'round_drop', r.drop_number
           ))
           FROM duc_non_returned_cages nrc
           LEFT JOIN couriers c ON nrc.courier_id = c.id
           LEFT JOIN rounds r ON nrc.round_id = r.id
           WHERE nrc.cage_return_report_id = crr.id),
          '[]'::json
        ) as non_returned_cages
      FROM duc_cage_return_reports crr
      LEFT JOIN team_members tm ON crr.submitted_by_team_member_id = tm.id
      LEFT JOIN sub_depots sd ON crr.sub_depot_id = sd.id
      WHERE crr.id = $1
    `, [id]);

    if (reportResult.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Cage Return Report not found', status: 404 });
    }
    const rawReport = reportResult[0];
    const report: CageReturnReport = {
        id: rawReport.id,
        date: rawReport.date,
        sub_depot_id: rawReport.sub_depot_id,
        submitted_by_team_member_id: rawReport.submitted_by_team_member_id,
        submitted_at: rawReport.submitted_at,
        notes: rawReport.notes,
        non_returned_cages: rawReport.non_returned_cages || [],
        createdAt: rawReport.createdAt,
        updatedAt: rawReport.updatedAt,
        submitted_by_name: rawReport.submitted_by_name,
        sub_depot_name: rawReport.sub_depot_name,
    };
    return NextResponse.json<ApiResponse<CageReturnReport>>({ data: report, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/cage-return-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch cage return report', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const body: Omit<CageReturnReport, 'id' | 'createdAt' | 'updatedAt' | 'submitted_by_name' | 'sub_depot_name'> = await _request.json();

    if (!body.date || !body.sub_depot_id || !body.submitted_by_team_member_id) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for update.', status: 400 });
    }
    
    await dbClient.query('BEGIN');

    const reportUpdateResult = await dbClient.query<CageReturnReport>(
      `UPDATE duc_cage_return_reports SET 
         date = $1, sub_depot_id = $2, submitted_by_team_member_id = $3, 
         notes = $4, submitted_at = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [body.date, body.sub_depot_id, body.submitted_by_team_member_id, body.notes, body.submitted_at || new Date().toISOString(), id]
    );

    if (reportUpdateResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Cage Return Report not found', status: 404 });
    }
    const updatedReportBasic = reportUpdateResult.rows[0];

    await dbClient.query('DELETE FROM duc_non_returned_cages WHERE cage_return_report_id = $1', [id]);
    const savedNonReturnedCages: NonReturnedCageDetail[] = [];
    if (body.non_returned_cages && body.non_returned_cages.length > 0) {
      for (const nrc of body.non_returned_cages) {
        const nrcResult = await dbClient.query<NonReturnedCageDetail>(
          `INSERT INTO duc_non_returned_cages (cage_return_report_id, round_id, courier_id, reason, reported_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [id, nrc.round_id, nrc.courier_id, nrc.reason, nrc.reported_at || new Date().toISOString()]
        );
        savedNonReturnedCages.push(nrcResult.rows[0]);
      }
    }
    await dbClient.query('COMMIT');
    
    const finalReportResult = await query<CageReturnReportRawDBRow>(`
        SELECT crr.*, tm.name as submitted_by_name, sd.name as sub_depot_name
        FROM duc_cage_return_reports crr
        LEFT JOIN team_members tm ON crr.submitted_by_team_member_id = tm.id
        LEFT JOIN sub_depots sd ON crr.sub_depot_id = sd.id
        WHERE crr.id = $1
    `, [updatedReportBasic.id]);

    if (finalReportResult.length === 0) {
         // This case should ideally not happen if update was successful
        return NextResponse.json<ApiResponse>({ error: 'Failed to retrieve updated report details.', status: 500 });
    }
    const finalReportData = {...finalReportResult[0], non_returned_cages: savedNonReturnedCages};

    return NextResponse.json<ApiResponse<CageReturnReport>>({ data: finalReportData, status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/cage-return-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update cage return report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    await dbClient.query('DELETE FROM duc_non_returned_cages WHERE cage_return_report_id = $1', [id]);
    const result = await dbClient.query('DELETE FROM duc_cage_return_reports WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Cage Return Report not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Cage Return Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/cage-return-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete cage return report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
