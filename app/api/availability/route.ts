// app/api/availability/route.ts
import { NextResponse } from 'next/server';
import type { AvailabilityRecord, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('teamMemberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let queryString = 'SELECT * FROM availability_records';
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (teamMemberId) {
      conditions.push(`team_member_id = $${paramIndex++}`);
      queryParams.push(teamMemberId);
    }
    if (startDate) {
      conditions.push(`date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push(`date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (conditions.length > 0) {
      queryString += ' WHERE ' + conditions.join(' AND ');
    }
    queryString += ' ORDER BY date ASC, team_member_id ASC';
    
    const records = await query<AvailabilityRecord>(queryString, queryParams);
    return NextResponse.json<ApiResponse<AvailabilityRecord[]>>({ data: records, status: 200 });
  } catch (error: any) {
    console.error('GET /api/availability Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch availability records', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<AvailabilityRecord, 'id' | 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.team_member_id || !body.date || !body.status) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Team Member ID, Date, and Status are required', status: 400});
    }

    // Upsert logic: If record exists for team_member_id and date, update it. Otherwise, insert.
    // The ID in types.ts is a composite: team_member_id, date.
    // For the DB, it's better to use a unique constraint on (team_member_id, date) and handle upsert.
    const id = `${body.team_member_id}__${body.date}`; // Composite ID for client-side identification if needed.
                                                      // DB table should have unique constraint on (team_member_id, date)

    const result = await query<AvailabilityRecord>(
      `INSERT INTO availability_records (team_member_id, date, status, notes, start_time, end_time) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (team_member_id, date) DO UPDATE SET 
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         updated_at = NOW()
       RETURNING *`,
      [body.team_member_id, body.date, body.status, body.notes, body.start_time, body.end_time]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create or update availability record', status: 500});
    }
    // Add the composite ID to the response for client-side consistency, even though DB might have its own serial PK.
    const responseRecord = { ...result[0], id }; 
    return NextResponse.json<ApiResponse<AvailabilityRecord>>({ data: responseRecord, status: 201 });

  } catch (error: any) {
    console.error('POST /api/availability Error:', error);
    if (error.code === '23503') { // Foreign key violation for team_member_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to save availability', message: 'Invalid Team Member ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to save availability record', message: error.message, status: 500 });
  }
}