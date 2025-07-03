// app/api/hht-assets/[serial_number]/route.ts
import { NextResponse } from 'next/server';
import type { HHTAsset, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { serial_number: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { serial_number } = params;
  try {
    const result = await query<HHTAsset>('SELECT * FROM hht_assets WHERE serial_number = $1', [serial_number]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'HHT Asset not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<HHTAsset>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/hht-assets/${serial_number} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch HHT Asset', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { serial_number } = params;
  try {
    const body: Partial<Omit<HHTAsset, 'serial_number' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['assigned_to_team_member_id', 'status', 'last_service_date', 'purchase_date', 'model_number', 'notes'];

    Object.entries(body).forEach(([key, value]) => {
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value === '' && (key === 'assigned_to_team_member_id' || key === 'last_service_date' || key === 'purchase_date' || key === 'model_number' || key === 'notes') ? null : value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(serial_number);
    const queryString = `UPDATE hht_assets SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE serial_number = $${queryIndex} RETURNING *`;
    
    const result = await query<HHTAsset>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'HHT Asset not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<HHTAsset>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/hht-assets/${serial_number} Error:`, error);
    if (error.code === '23503') { // Foreign key violation for assigned_to_team_member_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update HHT Asset', message: 'Invalid Team Member ID for assignment.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update HHT Asset', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { serial_number } = params;
  try {
    // Check for dependencies (e.g., scan_logs)
    const scanLogRefs = await query('SELECT 1 FROM scan_logs WHERE hht_serial = $1 LIMIT 1', [serial_number]);
    if (scanLogRefs.length > 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete HHT Asset', message: 'This HHT Asset is referenced in scan logs.', status: 409 });
    }

    const result = await query('DELETE FROM hht_assets WHERE serial_number = $1 RETURNING serial_number', [serial_number]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'HHT Asset not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `HHT Asset ${serial_number} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/hht-assets/${serial_number} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete HHT Asset', message: error.message, status: 500 });
  }
}