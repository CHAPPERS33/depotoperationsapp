// app/api/rounds/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Round, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<Round>('SELECT * FROM rounds WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Round not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<Round>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/rounds/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch round', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<Round, 'id' | 'createdAt' | 'updatedAt'>> = await __request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    if (body.drop_number !== undefined && body.drop_number <= 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Drop number must be positive if provided.', status: 400 });
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['sub_depot_id', 'drop_number', 'round_name', 'is_active'];

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
    const queryString = `UPDATE rounds SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<Round>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Round not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<Round>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/rounds/${id} Error:`, error);
     if (error.code === '23503') { // Foreign key violation for sub_depot_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update round', message: 'Invalid Sub Depot ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update round', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    // Check for dependencies like parcel_scan_entries or timeslot_assignments
    const parcelScanRefs = await query('SELECT 1 FROM parcel_scan_entries WHERE round_id = $1 LIMIT 1', [id]);
    if (parcelScanRefs.length > 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete round', message: 'This round is referenced in parcel scan entries.', status: 409 });
    }
    const timeslotRefs = await query('SELECT 1 FROM timeslot_assignments WHERE round_id = $1 LIMIT 1', [id]);
    if (timeslotRefs.length > 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete round', message: 'This round is referenced in timeslot assignments.', status: 409 });
    }

    const result = await query('DELETE FROM rounds WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Round not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Round ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/rounds/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete round', message: error.message, status: 500 });
  }
}