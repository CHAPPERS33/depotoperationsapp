// app/api/rounds/route.ts
import { NextResponse } from 'next/server';
import type { Round, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const rounds = await query<Round>('SELECT * FROM rounds ORDER BY id ASC');
    return NextResponse.json<ApiResponse<Round[]>>({ data: rounds, status: 200 });
  } catch (error: any) {
    console.error('GET /api/rounds Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch rounds', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<Round, 'createdAt' | 'updatedAt'> = await _request.json();
    
    if (!body.id || body.sub_depot_id === undefined || body.drop_number === undefined) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Round ID, Sub Depot ID, and Drop Number are required', status: 400});
    }
    if (body.drop_number <= 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Drop number must be positive.', status: 400 });
    }

    const result = await query<Round>(
      `INSERT INTO rounds (id, sub_depot_id, drop_number, round_name, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [body.id, body.sub_depot_id, body.drop_number, body.round_name, body.is_active !== undefined ? body.is_active : true]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create round', status: 500});
    }
    return NextResponse.json<ApiResponse<Round>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/rounds Error:', error);
    if (error.code === '23505') { // Unique constraint violation (likely ID)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create round', message: 'A round with this ID already exists.', status: 409});
    }
    if (error.code === '23503') { // Foreign key violation for sub_depot_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create round', message: 'Invalid Sub Depot ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create round', message: error.message, status: 500 });
  }
}