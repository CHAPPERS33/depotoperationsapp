
// app/api/cage-return-reports/route.ts
import { NextResponse } from 'next/server';
import type { CageReturnReport, NonReturnedCageDetail, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const reports = await query<any>(`
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
      ORDER BY crr.submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<CageReturnReport[]>>({ data: reports.map(r => ({...r, non_returned_cages: r.non_returned_cages || []})), status: 200 });
  } catch (error: any) {
    console.error('GET /api/cage-return-reports Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch cage return reports', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  const dbClient = await getClient();
  try {
    const body: Omit<CageReturnReport, 'id' | 'createdAt' | 'updatedAt' | 'submitted_by_name' | 'sub_depot_name'> = await __request.json();
    
    if (!body.date || !body.sub_depot_id || !body.submitted_by_team_member_id) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for cage return report.', status: 400 });
    }

    const reportId = `CRR-${body.date}-${body.sub_depot_id}-${Date.now().toString().slice(-5)}`;

    await dbClient.query('BEGIN');

    const reportResult = await dbClient.query<CageReturnReport>(
      `INSERT INTO duc_cage_return_reports (id, date, sub_depot_id, submitted_by_team_member_id, submitted_at, notes)
       VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *`,
      [reportId, body.date, body.sub_depot_id, body.submitted_by_team_member_id, body.notes]
    );
    const newReport = reportResult.rows[0];

    const savedNonReturnedCages: NonReturnedCageDetail[] = [];
    if (body.non_returned_cages && body.non_returned_cages.length > 0) {
      for (const nrc of body.non_returned_cages) {
        const nrcResult = await dbClient.query<NonReturnedCageDetail>(
          `INSERT INTO duc_non_returned_cages (cage_return_report_id, round_id, courier_id, reason, reported_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [reportId, nrc.round_id, nrc.courier_id, nrc.reason, nrc.reported_at || new Date().toISOString()]
        );
        savedNonReturnedCages.push(nrcResult.rows[0]);
      }
    }
    await dbClient.query('COMMIT');
    
    newReport.non_returned_cages = savedNonReturnedCages;
    // Fetch names for response
    const finalReportResult = await query<any>(`
        SELECT crr.*, tm.name as submitted_by_name, sd.name as sub_depot_name
        FROM duc_cage_return_reports crr
        LEFT JOIN team_members tm ON crr.submitted_by_team_member_id = tm.id
        LEFT JOIN sub_depots sd ON crr.sub_depot_id = sd.id
        WHERE crr.id = $1
    `, [newReport.id]);
    const finalReportData = {...finalReportResult[0], non_returned_cages: savedNonReturnedCages};

    return NextResponse.json<ApiResponse<CageReturnReport>>({ data: finalReportData, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/cage-return-reports Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to create cage return report', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
