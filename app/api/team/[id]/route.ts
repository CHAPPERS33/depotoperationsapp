// app/api/team/[id]/route.ts
import { NextResponse } from 'next/server';
import type { TeamMember, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<TeamMember>('SELECT * FROM team_members WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Team member not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<TeamMember>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/team/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch team member', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    if (body.name !== undefined && !body.name.trim()) {
        return NextResponse.json<ApiResponse>({ error: 'Name cannot be empty if provided', status: 400});
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'position', 'email', 'phone_number', 'delivery_unit_id', 'sub_depot_id', 'is_driver_for_team_member_id', 'hourly_rate', 'is_active', 'password_hash'];

    Object.entries(body).forEach(([key, value]) => {
      // Direct mapping as types.ts and db schema should align for these fields
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400});
    }

    values.push(id); // For the WHERE id = $N clause
    const queryString = `UPDATE team_members SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<TeamMember>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Team member not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<TeamMember>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/team/${id} Error:`, error);
    if (error.code === '23505') { 
        return NextResponse.json<ApiResponse>({ error: 'Failed to update team member', message: 'Update violates a unique constraint (e.g., email).', status: 409});
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to update team member', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM team_members WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Team member not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Team member ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/team/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete team member', message: error.message, status: 500 });
  }
}
