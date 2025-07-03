// app/api/couriers/route.ts
import { NextResponse } from 'next/server';
import type { Courier, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const couriers = await query<Courier>(`
      SELECT c.*, tm.name as driver_team_member_name 
      FROM couriers c
      LEFT JOIN team_members tm ON c.is_driver_for_team_member_id = tm.id
      ORDER BY c.name ASC
    `);
    return NextResponse.json<ApiResponse<Courier[]>>({ data: couriers, status: 200 });
  } catch (error: any) {
    console.error('GET /api/couriers Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch couriers', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<Courier, 'createdAt' | 'updatedAt' | 'driver_team_member_name'> = await __request.json(); 
    
    if (!body.id || !body.name) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Courier ID and Name are required', status: 400});
    }

    const result = await query<Courier>(
      `INSERT INTO couriers (id, name, is_driver_for_team_member_id, notes, telephone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, is_driver_for_team_member_id, notes, telephone, is_active, created_at, updated_at,
                 (SELECT name FROM team_members tm WHERE tm.id = $3) as driver_team_member_name`,
      [body.id, body.name, body.is_driver_for_team_member_id, body.notes, body.telephone, body.is_active !== undefined ? body.is_active : true]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create courier', status: 500});
    }
    return NextResponse.json<ApiResponse<Courier>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/couriers Error:', error);
    if (error.code === '23505') { 
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create courier', message: 'A courier with this ID already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create courier', message: error.message, status: 500 });
  }
}
