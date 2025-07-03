// app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Client, ApiResponse } from '../../../../types';
 import  { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string }; // Client ID is number, but route params are string
}

export async function GET(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Client ID format', status: 400 });
  }
  try {
    const result = await query<Client>('SELECT * FROM clients WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Client not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<Client>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/clients/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch client', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Client ID format', status: 400 });
  }
  try {
    const body: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'code', 'is_high_priority', 'contact_person', 'contact_email'];

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
    const queryString = `UPDATE clients SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<Client>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Client not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<Client>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/clients/${id} Error:`, error);
    if (error.code === '23505') { // Unique constraint violation (name or code)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update client', message: 'A client with this name or code already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update client', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Client ID format', status: 400 });
  }
  try {
    // Check for dependencies
    const parcelScanRefs = await query('SELECT 1 FROM parcel_scan_entries WHERE client_id = $1 LIMIT 1', [id]);
    if (parcelScanRefs.length > 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete client', message: 'This client is referenced in parcel scan entries.', status: 409 });
    }
    // Add other dependency checks if needed (e.g., segregated_parcels)

    const result = await query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Client not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Client ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/clients/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete client', message: error.message, status: 500 });
  }
}