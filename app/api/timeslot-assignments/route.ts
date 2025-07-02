// app/api/timeslot-assignments/route.ts
import { NextResponse } from 'next/server';
import type { TimeslotAssignment, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  try {
    let queryString = 'SELECT * FROM timeslot_assignments';
    const queryParams = [];
    if (date) {
      queryString += ' WHERE date = $1';
      queryParams.push(date);
    }
    queryString += ' ORDER BY date DESC, timeslot ASC';
    const assignments = await query<TimeslotAssignment>(queryString, queryParams);
    return NextResponse.json<ApiResponse<TimeslotAssignment[]>>({ data: assignments, status: 200 });
  } catch (error: any) {
    console.error('GET /api/timeslot-assignments Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch timeslot assignments', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<TimeslotAssignment, 'id' | 'createdAt' | 'updatedAt'> = await request.json();
    
    if (!body.round_id || !body.sub_depot_id || !body.date || !body.timeslot) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Round ID, Sub Depot ID, Date, and Timeslot are required', status: 400});
    }
    if (!/^\d{2}:\d{2}$/.test(body.timeslot)) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot must be in HH:MM format.', status: 400});
    }

    const result = await query<TimeslotAssignment>(
      `INSERT INTO timeslot_assignments (round_id, sub_depot_id, date, timeslot, assigned_by_team_member_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [body.round_id, body.sub_depot_id, body.date, body.timeslot, body.assigned_by_team_member_id, body.notes]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create timeslot assignment', status: 500});
    }
    return NextResponse.json<ApiResponse<TimeslotAssignment>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/timeslot-assignments Error:', error);
    if (error.code === '23503') { // Foreign key violation
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create assignment', message: 'Invalid Round, Sub Depot, or Team Member ID.', status: 400});
    }
     if (error.code === '23505') { // Unique constraint violation if (round_id, date) is unique
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create assignment', message: 'This round already has a timeslot assignment for this date.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create timeslot assignment', message: error.message, status: 500 });
  }
}