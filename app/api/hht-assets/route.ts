// app/api/hht-assets/route.ts
import { NextResponse } from 'next/server';
import type { HHTAsset, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const hhtAssets = await query<HHTAsset>('SELECT * FROM hht_assets ORDER BY serial_number ASC');
    return NextResponse.json<ApiResponse<HHTAsset[]>>({ data: hhtAssets, status: 200 });
  } catch (error: any) {
    console.error('GET /api/hht-assets Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch HHT assets', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<HHTAsset, 'createdAt' | 'updatedAt'> = await request.json();
    
    if (!body.serial_number || !body.status) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Serial Number and Status are required', status: 400});
    }

    const result = await query<HHTAsset>(
      `INSERT INTO hht_assets (serial_number, assigned_to_team_member_id, status, last_service_date, purchase_date, model_number, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [body.serial_number, body.assigned_to_team_member_id, body.status, body.last_service_date, body.purchase_date, body.model_number, body.notes]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create HHT asset', status: 500});
    }
    return NextResponse.json<ApiResponse<HHTAsset>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/hht-assets Error:', error);
    if (error.code === '23505') { // Unique constraint violation (serial_number)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create HHT asset', message: 'An HHT asset with this serial number already exists.', status: 409});
    }
     if (error.code === '23503') { // Foreign key violation for assigned_to_team_member_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create HHT asset', message: 'Invalid Team Member ID for assignment.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create HHT asset', message: error.message, status: 500 });
  }
}