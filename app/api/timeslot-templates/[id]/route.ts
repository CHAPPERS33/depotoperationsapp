// app/api/timeslot-templates/[id]/route.ts
import { NextResponse } from 'next/server';
import type { TimeslotTemplate, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<TimeslotTemplate>('SELECT * FROM timeslot_templates WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Template not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<TimeslotTemplate>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/timeslot-templates/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch timeslot template', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<TimeslotTemplate, 'id' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    if (body.max_capacity_per_slot !== undefined && body.max_capacity_per_slot <= 0) {
         return NextResponse.json<ApiResponse<null>>({ error: 'Max capacity must be positive if provided.', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'sub_depot_id', 'slots', 'max_capacity_per_slot', 'is_default', 'days_of_week'];

    Object.entries(body).forEach(([key, value]) => {
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE timeslot_templates SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<TimeslotTemplate>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Template not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<TimeslotTemplate>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/timeslot-templates/${id} Error:`, error);
    if (error.code === '23503') { // Foreign key violation for sub_depot_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update template', message: 'Invalid Sub Depot ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update timeslot template', message: error.message, status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    // Add dependency checks if needed (e.g., if timeslot_assignments could link to templates directly)
    const result = await query('DELETE FROM timeslot_templates WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Template not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Timeslot Template ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/timeslot-templates/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete timeslot template', message: error.message, status: 500 });
  }
}