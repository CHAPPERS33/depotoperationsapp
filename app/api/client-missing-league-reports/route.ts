// app/api/client-missing-league-reports/route.ts
import { NextResponse } from 'next/server';
import type { ClientMissingLeagueReport, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const reports = await query<ClientMissingLeagueReport>(
      `SELECT *, submitted_at AS generated_at, submitted_by_team_member_id AS generated_by 
       FROM duc_client_missing_league_reports 
       ORDER BY submitted_at DESC`
    );
    return NextResponse.json<ApiResponse<ClientMissingLeagueReport[]>>({
      data: reports,
      status: 200,
    });
  } catch (error: any) {
    console.error('GET /api/client-missing-league-reports Error:', error);
    return NextResponse.json<ApiResponse>({
      error: 'Failed to fetch reports',
      message: error.message,
      status: 500,
    });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<ClientMissingLeagueReport, 'id' | 'submitted_at'> = await _request.json();

    if (
      !body.periodType ||
      !body.startDate ||
      !body.endDate ||
      !body.clients ||
      !body.submitted_by_team_member_id
    ) {
      return NextResponse.json<ApiResponse>({
        error: 'Missing required fields for report.',
        status: 400,
      });
    }

    const result = await query<ClientMissingLeagueReport>(
      `INSERT INTO duc_client_missing_league_reports 
        (period_type, start_date, end_date, clients, submitted_by_team_member_id, submitted_at)
       VALUES 
        ($1, $2, $3, $4, $5, NOW())
       RETURNING *, submitted_at AS generated_at, submitted_by_team_member_id AS generated_by`,
      [
        body.periodType,
        body.startDate,
        body.endDate,
        JSON.stringify(body.clients),
        body.submitted_by_team_member_id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({
        error: 'Failed to save report',
        status: 500,
      });
    }

    return NextResponse.json<ApiResponse<ClientMissingLeagueReport>>({
      data: result[0],
      status: 201,
    });
  } catch (error: any) {
    console.error('POST /api/client-missing-league-reports Error:', error);
    return NextResponse.json<ApiResponse>({
      error: 'Failed to save report',
      message: error.message,
      status: 500,
    });
  }
}
