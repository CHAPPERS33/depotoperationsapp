// app/api/sub-depots/route.ts
import { NextResponse } from 'next/server';
import type { SubDepot, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const subDepots = await query<SubDepot>('SELECT * FROM sub_depots ORDER BY name ASC');
    return NextResponse.json<ApiResponse<SubDepot[]>>({ data: subDepots, status: 200 });
  } catch (error: any) {
    console.error('GET /api/sub-depots Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch sub depots', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<SubDepot, 'id' | 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.name || !body.delivery_unit_id) { // ID is SERIAL, so not provided by client for new
        return NextResponse.json<ApiResponse<null>>({ error: 'Sub Depot Name and Delivery Unit ID are required', status: 400});
    }

    const result = await query<SubDepot>(
      `INSERT INTO sub_depots (name, delivery_unit_id, location_description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [body.name, body.delivery_unit_id, body.location_description]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create sub depot', status: 500});
    }
    return NextResponse.json<ApiResponse<SubDepot>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/sub-depots Error:', error);
    // Add specific error handling if needed, e.g., for foreign key violation if delivery_unit_id doesn't exist
    if (error.code === '23503') { // Foreign key violation
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create sub depot', message: 'Invalid Delivery Unit ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create sub depot', message: error.message, status: 500 });
  }
}