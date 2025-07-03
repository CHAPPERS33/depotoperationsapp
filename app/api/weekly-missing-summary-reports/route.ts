// app/api/weekly-missing-summary-reports/route.ts
import { NextResponse } from 'next/server';
import type { WeeklyMissingSummaryReport, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const reports = await query<any>(`
      SELECT 
        wmsr.*,
        wmsr.submitted_at AS generated_at,
        wmsr.submitted_by_team_member_id AS generated_by,
        tm.name AS submitted_by_team_member_id_name
      FROM duc_weekly_missing_summary_reports wmsr
      LEFT JOIN team_members tm ON wmsr.submitted_by_team_member_id = tm.id
      ORDER BY wmsr.submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<WeeklyMissingSummaryReport[]>>({ data: reports, status: 200 });
  } catch (error: any) {
    console.error('GET /api/weekly-missing-summary-reports Error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Failed to fetch weekly missing summary reports',
      message: error.message,
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<WeeklyMissingSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt' | 'generated_by_name'> = await __request.json();

    if (
      !body.week_start_date ||
      !body.week_end_date ||
      body.total_missing === undefined ||
      !body.missing_by_client ||
      !body.parcels_summary ||
      !body.submitted_by_team_member_id
    ) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Missing required fields for weekly missing summary report.',
        status: 400,
      });
    }

    const result = await query<WeeklyMissingSummaryReport>(
      `INSERT INTO duc_weekly_missing_summary_reports 
        (week_start_date, week_end_date, total_missing, missing_by_client, parcels_summary, notes, submitted_by_team_member_id, submitted_at)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING 
        id, week_start_date, week_end_date, total_missing, missing_by_client, parcels_summary, notes, submitted_by_team_member_id, submitted_at, created_at, updated_at,
        (SELECT name FROM team_members tm WHERE tm.id = $7) AS submitted_by_team_member_id_name`,
      [
        body.week_start_date,
        body.week_end_date,
        body.total_missing,
        JSON.stringify(body.missing_by_client),
        JSON.stringify(body.parcels_summary),
        body.notes,
        body.submitted_by_team_member_id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to create weekly missing summary report',
        status: 500,
      });
    }

    return NextResponse.json<ApiResponse<WeeklyMissingSummaryReport>>({ data: result[0], status: 201 });
  } catch (error: any) {
    console.error('POST /api/weekly-missing-summary-reports Error:', error);
    return NextResponse.json<ApiResponse<null>>({
      error: 'Failed to create weekly missing summary report',
      message: error.message,
      status: 500,
    });
  }
}
