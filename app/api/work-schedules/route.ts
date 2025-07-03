// app/api/work-schedules/route.ts
import { NextResponse } from 'next/server';
import type { WorkSchedule, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const { searchParams } = new URL(_request.url);
    const date = searchParams.get('date');
    
    let queryString = `
      SELECT ws.*, tm.name as team_member_name, sd.name as sub_depot_name 
      FROM work_schedules ws
      JOIN team_members tm ON ws.team_member_id = tm.id
      JOIN sub_depots sd ON ws.sub_depot_id = sd.id
    `;
    const queryParams: any[] = [];

    if (date) {
      queryString += ' WHERE ws.date = $1';
      queryParams.push(date);
    }
    queryString += ' ORDER BY ws.date DESC, ws.shift_start_time ASC';
    
    const workSchedules = await query<WorkSchedule>(queryString, queryParams);
    return NextResponse.json<ApiResponse<WorkSchedule[]>>({ data: workSchedules, status: 200 });
  } catch (error: any) {
    console.error('GET /api/work-schedules Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch work schedules', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.date || !body.team_member_id || !body.sub_depot_id || body.scheduled_hours === undefined) {
        return NextResponse.json<ApiResponse>({ error: 'Missing required fields for work schedule', status: 400});
    }

    const result = await query<WorkSchedule>(
      `INSERT INTO work_schedules (date, team_member_id, sub_depot_id, forecast_id, scheduled_hours, actual_hours, shift_start_time, shift_end_time, is_confirmed, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [body.date, body.team_member_id, body.sub_depot_id, body.forecast_id, body.scheduled_hours, body.actual_hours, body.shift_start_time, body.shift_end_time, body.is_confirmed !== undefined ? body.is_confirmed : false, body.notes]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'Failed to create work schedule', status: 500});
    }
    return NextResponse.json<ApiResponse<WorkSchedule>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/work-schedules Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to create work schedule', message: error.message, status: 500 });
  }
}