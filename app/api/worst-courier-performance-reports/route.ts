// app/api/worst-courier-performance-reports/route.ts
import { NextResponse } from 'next/server';
import type { WorstCourierPerformanceReport, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const reports = await query<WorstCourierPerformanceReport>(
      'SELECT *, submitted_at AS generated_at, submitted_by_team_member_id AS generated_by FROM duc_worst_courier_performance_reports ORDER BY submitted_at DESC'
    );
    return NextResponse.json<ApiResponse<WorstCourierPerformanceReport[]>>({
      data: reports,
      status: 200,
    });
  } catch (error: any) {
    console.error('GET /api/worst-courier-performance-reports Error:', error);
    return NextResponse.json<ApiResponse>({
      error: 'Failed to fetch reports',
      message: error.message,
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<WorstCourierPerformanceReport, 'id' | 'submitted_at'> = await request.json();

    if (
      !body.periodType ||
      !body.startDate ||
      !body.endDate ||
      !body.couriers ||
      !body.submitted_by_team_member_id
    ) {
      return NextResponse.json<ApiResponse>({
        error: 'Missing required fields for report.',
        status: 400,
      });
    }

    const result = await query<WorstCourierPerformanceReport>(
      `INSERT INTO duc_worst_courier_performance_reports 
        (period_type, start_date, end_date, couriers, submitted_by_team_member_id, submitted_at)
       VALUES 
        ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *, submitted_at AS generated_at, submitted_by_team_member_id AS generated_by`,
      [
        body.periodType,
        body.startDate,
        body.endDate,
        JSON.stringify(body.couriers),
        body.submitted_by_team_member_id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({
        error: 'Failed to save report',
        status: 500,
      });
    }

    return NextResponse.json<ApiResponse<WorstCourierPerformanceReport>>({
      data: result[0],
      status: 201,
    });
  } catch (error: any) {
    console.error('POST /api/worst-courier-performance-reports Error:', error);
    return NextResponse.json<ApiResponse>({
      error: 'Failed to save report',
      message: error.message,
      status: 500,
    });
  }
}
