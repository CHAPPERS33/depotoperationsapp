// app/api/vehicles/route.ts
import { NextResponse } from 'next/server';
import type { Vehicle, VehicleType, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const vehicles = await query<Vehicle>('SELECT * FROM vehicles ORDER BY registration ASC');
    return NextResponse.json<ApiResponse<Vehicle[]>>({ data: vehicles, status: 200 });
  } catch (error: any) {
    console.error('GET /api/vehicles Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch vehicles', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<Vehicle, 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.id || !body.registration || !body.type) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Vehicle ID, Registration, and Type are required', status: 400});
    }

    const result = await query<Vehicle>(
      `INSERT INTO vehicles (id, registration, type, notes, capacity_kg, capacity_m3, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [body.id, body.registration, body.type, body.notes, body.capacity_kg, body.capacity_m3, body.is_active !== undefined ? body.is_active : true]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create vehicle', status: 500});
    }
    return NextResponse.json<ApiResponse<Vehicle>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/vehicles Error:', error);
    if (error.code === '23505') { // Unique constraint violation (ID or registration)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create vehicle', message: 'A vehicle with this ID or registration already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create vehicle', message: error.message, status: 500 });
  }
}