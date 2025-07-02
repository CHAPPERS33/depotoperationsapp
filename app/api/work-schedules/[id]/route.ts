// app/api/work-schedules/[id]/route.ts
import { NextResponse } from 'next/server';
import type { WorkSchedule, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<WorkSchedule>(`
        SELECT ws.*, tm.name as team_member_name, sd.name as sub_depot_name 
        FROM work_schedules ws
        JOIN team_members tm ON ws.team_member_id = tm.id
        JOIN sub_depots sd ON ws.sub_depot_id = sd.id
        WHERE ws.id = $1
    `, [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Work schedule not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<WorkSchedule>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/work-schedules/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch work schedule', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      const allowedColumns = ['date', 'team_member_id', 'sub_depot_id', 'forecast_id', 'scheduled_hours', 'actual_hours', 'shift_start_time', 'shift_end_time', 'is_confirmed', 'notes'];
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(key === 'scheduled_hours' || key === 'actual_hours' ? Number(value) : (key === 'sub_depot_id' ? Number(value) : value));
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE work_schedules SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<WorkSchedule>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Work schedule not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<WorkSchedule>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/work-schedules/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update work schedule', message: error.message, status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM work_schedules WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Work schedule not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Work schedule ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/work-schedules/${id} Error:`, error);
    // Check for foreign key constraints if necessary
    if (error.code === '23503') {
      return NextResponse.json<ApiResponse>({ error: 'Failed to delete work schedule', message: 'This work schedule is referenced by other records (e.g., invoices).', status: 409 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete work schedule', message: error.message, status: 500 });
  }
}