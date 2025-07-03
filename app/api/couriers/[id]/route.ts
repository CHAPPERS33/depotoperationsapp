// app/api/couriers/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Courier, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<Courier>(`
      SELECT c.*, tm.name as driver_team_member_name 
      FROM couriers c
      LEFT JOIN team_members tm ON c.is_driver_for_team_member_id = tm.id
      WHERE c.id = $1
    `, [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Courier not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<Courier>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/couriers/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch courier', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<Courier, 'id' | 'createdAt' | 'updatedAt'>> = await __request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    if (body.name !== undefined && !body.name.trim()) {
        return NextResponse.json<ApiResponse>({ error: 'Name cannot be empty if provided', status: 400});
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'is_driver_for_team_member_id', 'notes', 'telephone', 'is_active'];

    Object.entries(body).forEach(([key, value]) => {
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400});
    }

    values.push(id); // For the WHERE id = $N clause
    const queryString = `UPDATE couriers SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<Courier>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Courier not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<Courier>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/couriers/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update courier', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM couriers WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Courier not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Courier ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/couriers/${id} Error:`, error);
    if (error.code === '23503') { 
        return NextResponse.json<ApiResponse>({ error: 'Failed to delete courier', message: 'Courier cannot be deleted because they are referenced in other records.', status: 409});
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete courier', message: error.message, status: 500 });
  }
}
