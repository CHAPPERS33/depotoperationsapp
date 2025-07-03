// app/api/top-misrouted-destinations-reports/route.ts
import { NextResponse } from 'next/server';
import type { TopMisroutedDestinationsReport, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const reports = await query<TopMisroutedDestinationsReport>(`
      SELECT 
        id,
        report_date,
        report_period_start as start_date,
        report_period_end as end_date,
        submitted_by_team_member_id as generated_by,
        submitted_at as generated_at,
        report_data as destinations,
        notes,
        created_at,
        updated_at
      FROM duc_top_misrouted_destinations_reports 
      ORDER BY submitted_at DESC
    `);
    return NextResponse.json<ApiResponse<TopMisroutedDestinationsReport[]>>({ data: reports, status: 200 });
  } catch (error: any) {
    console.error('GET /api/top-misrouted-destinations-reports Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch reports', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<TopMisroutedDestinationsReport, 'id'> = await _request.json();
    
    if (!body.startDate || !body.endDate || !body.destinations || !body.generatedBy) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for report.', status: 400 });
    }

    const result = await query<TopMisroutedDestinationsReport>(
      `INSERT INTO duc_top_misrouted_destinations_reports (
        report_date, 
        report_period_start, 
        report_period_end, 
        report_data, 
        submitted_by_team_member_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING 
        id,
        report_date,
        report_period_start as start_date,
        report_period_end as end_date,
        submitted_by_team_member_id as generated_by,
        submitted_at as generated_at,
        report_data as destinations,
        notes,
        created_at,
        updated_at`,
      [
        new Date().toISOString().split('T')[0], // report_date (today)
        body.startDate, 
        body.endDate, 
        JSON.stringify(body.destinations), 
        body.generatedBy,
        
      ]
    );
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Failed to save report', status: 500 });
    }
    return NextResponse.json<ApiResponse<TopMisroutedDestinationsReport>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/top-misrouted-destinations-reports Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to save report', message: error.message, status: 500 });
  }
}