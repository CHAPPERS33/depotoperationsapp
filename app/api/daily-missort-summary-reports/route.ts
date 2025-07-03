// app/api/daily-missort-summary-reports/route.ts
import { NextResponse } from 'next/server';
import type { DailyMissortSummaryReport, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const reports = await query<any>(`
      SELECT 
        dmsr.*,
        tm.name as submitted_by_name,
        sd.name as sub_depot_name_filter 
      FROM duc_daily_missort_summary_reports dmsr
      LEFT JOIN team_members tm ON dmsr.submitted_by_team_member_id = tm.id
      LEFT JOIN sub_depots sd ON dmsr.sub_depot_id = sd.id
      ORDER BY dmsr.date DESC, dmsr.submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<DailyMissortSummaryReport[]>>({ data: reports, status: 200 });
  } catch (error: any) {
    console.error('GET /api/daily-missort-summary-reports Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch daily missort summary reports', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<DailyMissortSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt' | 'submitted_by_name' | 'sub_depot_name_filter'> = await __request.json();
    
    if (!body.date || !body.submitted_by_team_member_id || body.total_missorts === undefined || !body.missorts_by_client || !body.missorts_by_round) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Missing required fields for daily missort summary report.', status: 400 });
    }

    const result = await query<DailyMissortSummaryReport>(
      `INSERT INTO duc_daily_missort_summary_reports (date, sub_depot_id, total_missorts, missorts_by_client, missorts_by_round, notes, submitted_by_team_member_id, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING id, date, sub_depot_id, total_missorts, missorts_by_client, missorts_by_round, notes, submitted_by_team_member_id, submitted_at, created_at, updated_at,
                 (SELECT name FROM team_members tm WHERE tm.id = $7) as submitted_by_name,
                 (SELECT name FROM sub_depots sd WHERE sd.id = $2) as sub_depot_name_filter`,
      [body.date, body.sub_depot_id, body.total_missorts, JSON.stringify(body.missorts_by_client), JSON.stringify(body.missorts_by_round), body.notes, body.submitted_by_team_member_id]
    );
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create daily missort summary report', status: 500 });
    }
    return NextResponse.json<ApiResponse<DailyMissortSummaryReport>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/daily-missort-summary-reports Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create daily missort summary report', message: error.message, status: 500 });
  }
}
