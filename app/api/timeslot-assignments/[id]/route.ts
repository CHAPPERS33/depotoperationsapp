// app/api/timeslot-assignments/[id]/route.ts
import { NextResponse } from 'next/server';
import type { TimeslotAssignment, ApiResponse } from '../../../../types';
 import  { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<TimeslotAssignment>('SELECT * FROM timeslot_assignments WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Assignment not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<TimeslotAssignment>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/timeslot-assignments/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch timeslot assignment', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<TimeslotAssignment, 'id' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    if (body.timeslot && !/^\d{2}:\d{2}$/.test(body.timeslot)) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot must be in HH:MM format if provided.', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['round_id', 'sub_depot_id', 'date', 'timeslot', 'assigned_by_team_member_id', 'notes'];

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
    const queryString = `UPDATE timeslot_assignments SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<TimeslotAssignment>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Assignment not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<TimeslotAssignment>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/timeslot-assignments/${id} Error:`, error);
    if (error.code === '23503') { // Foreign key violation
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update assignment', message: 'Invalid Round, Sub Depot, or Team Member ID.', status: 400});
    }
    if (error.code === '23505') { // Unique constraint violation if (round_id, date) is unique
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update assignment', message: 'This round already has a timeslot assignment for this date.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update timeslot assignment', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM timeslot_assignments WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Timeslot Assignment not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Timeslot Assignment ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/timeslot-assignments/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete timeslot assignment', message: error.message, status: 500 });
  }
}