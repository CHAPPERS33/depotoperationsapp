// app/api/delivery-units/[id]/route.ts
import { NextResponse } from 'next/server';
import type { DeliveryUnit, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<DeliveryUnit>('SELECT * FROM delivery_units WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Delivery unit not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<DeliveryUnit>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/delivery-units/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch delivery unit', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<DeliveryUnit, 'id' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'address', 'contact_email'];

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
    const queryString = `UPDATE delivery_units SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<DeliveryUnit>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Delivery unit not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<DeliveryUnit>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/delivery-units/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update delivery unit', message: error.message, status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    // Check if referenced by sub_depots or parcel_scan_entries (misrouted_du_id)
    const subDepotRefs = await query('SELECT 1 FROM sub_depots WHERE delivery_unit_id = $1 LIMIT 1', [id]);
    if (subDepotRefs.length > 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete delivery unit', message: 'This delivery unit is referenced by existing sub depots.', status: 409 });
    }
    const parcelScanRefs = await query('SELECT 1 FROM parcel_scan_entries WHERE misrouted_du_id = $1 LIMIT 1', [id]);
     if (parcelScanRefs.length > 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Cannot delete delivery unit', message: 'This delivery unit is referenced in parcel scan entries (misrouted).', status: 409 });
    }


    const result = await query('DELETE FROM delivery_units WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Delivery unit not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Delivery unit ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/delivery-units/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete delivery unit', message: error.message, status: 500 });
  }
}