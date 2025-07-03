// app/api/vehicles/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Vehicle, ApiResponse } from '../../../../types';
import  { query, getClient } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<Vehicle>('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Vehicle not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<Vehicle>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/vehicles/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch vehicle', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['registration', 'type', 'notes', 'capacity_kg', 'capacity_m3', 'is_active'];

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
    const queryString = `UPDATE vehicles SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<Vehicle>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Vehicle not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<Vehicle>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/vehicles/${id} Error:`, error);
    if (error.code === '23505') { // Unique constraint violation (registration)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update vehicle', message: 'A vehicle with this registration already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update vehicle', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    // Add dependency checks if vehicles are referenced in other tables (e.g., waves - though waves uses van_reg string not FK)
    const waveRefs = await query('SELECT 1 FROM waves WHERE van_reg = (SELECT registration FROM vehicles WHERE id = $1) LIMIT 1', [id]);
    if (waveRefs.length > 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete vehicle', message: 'This vehicle is referenced in wave entries.', status: 409 });
    }

    const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Vehicle not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Vehicle ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/vehicles/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete vehicle', message: error.message, status: 500 });
  }
}