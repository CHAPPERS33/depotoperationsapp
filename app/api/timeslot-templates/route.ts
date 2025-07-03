// app/api/timeslot-templates/route.ts
import { NextResponse } from 'next/server';
import type { TimeslotTemplate, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const templates = await query<TimeslotTemplate>('SELECT * FROM timeslot_templates ORDER BY name ASC');
    return NextResponse.json<ApiResponse<TimeslotTemplate[]>>({ data: templates, status: 200 });
  } catch (error: any) {
    console.error('GET /api/timeslot-templates Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch timeslot templates', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<TimeslotTemplate, 'id' | 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.name || !body.slots || body.slots.length === 0 || body.max_capacity_per_slot === undefined) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Name, Slots array, and Max Capacity are required', status: 400});
    }
    if (body.max_capacity_per_slot <= 0) {
         return NextResponse.json<ApiResponse<null>>({ error: 'Max capacity must be positive.', status: 400});
    }

    const result = await query<TimeslotTemplate>(
      `INSERT INTO timeslot_templates (name, sub_depot_id, slots, max_capacity_per_slot, is_default, days_of_week) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [body.name, body.sub_depot_id, body.slots, body.max_capacity_per_slot, body.is_default || false, body.days_of_week]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create timeslot template', status: 500});
    }
    return NextResponse.json<ApiResponse<TimeslotTemplate>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/timeslot-templates Error:', error);
     if (error.code === '23503') { // Foreign key violation for sub_depot_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create template', message: 'Invalid Sub Depot ID.', status: 400});
    }
    // Consider unique constraint on (name, sub_depot_id)
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create timeslot template', message: error.message, status: 500 });
  }
}