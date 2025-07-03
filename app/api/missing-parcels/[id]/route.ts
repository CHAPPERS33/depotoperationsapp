// app/api/missing-parcels/[id]/route.ts
import { NextResponse } from 'next/server';
import type { ParcelScanEntry, ApiResponse } from '../../../../types'; // Adjust path
import { query } from '../../../../lib/db'; // Adjust path

interface RouteParams {
  params: { id: string }; // ParcelScanEntry ID (UUID TEXT)
}

const buildSelectQueryById = (id: string) => {
  return {
    text: `
      SELECT 
        pse.*,
        c.name as client_name,
        cr.name as courier_name,
        tm.name as sorter_name,
        to_char(pse.created_at, 'DD/MM/YYYY') as "dateAdded"
      FROM parcel_scan_entries pse
      LEFT JOIN clients c ON pse.client_id = c.id
      LEFT JOIN couriers cr ON pse.courier_id = cr.id
      LEFT JOIN team_members tm ON pse.sorter_team_member_id = tm.id
      WHERE pse.id = $1
    `,
    values: [id]
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const { text, values } = buildSelectQueryById(id);
    const result = await query<ParcelScanEntry>(text, values);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Parcel scan entry not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<ParcelScanEntry>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/missing-parcels/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch parcel scan entry', message: error.message, status: 500 });
  }
}


export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<ParcelScanEntry, 'id' | 'createdAt' | 'updatedAt'>> = await __request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = [
        'round_id', 'drop_number', 'sub_depot_id', 'courier_id', 'barcode', 
        'sorter_team_member_id', 'client_id', 'time_scanned', 'scan_type', 
        'cfwd_courier_id', 'misrouted_du_id', 'rejected_courier_id', 
        'is_recovered', 'recovery_date', 'recovery_notes', 'notes'
    ];

    Object.entries(body).forEach(([key, value]) => {
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        // Handle potential type mismatches explicitly for numeric/boolean from JSON
        if (key === 'drop_number' || key === 'sub_depot_id' || key === 'client_id') {
            values.push(value === null ? null : Number(value));
        } else if (key === 'is_recovered') {
            values.push(Boolean(value));
        } else {
            values.push(value);
        }
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE parcel_scan_entries SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING id`;
    
    const updateResult = await query<{id: string}>(queryString, values);
    
    if (updateResult.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Parcel scan entry not found or no changes made', status: 404 });
    }
    
    // Fetch the updated record with joined names
    const { text: selectText, values: selectValues } = buildSelectQueryById(updateResult[0].id);
    const finalResult = await query<ParcelScanEntry>(selectText, selectValues);

    return NextResponse.json<ApiResponse<ParcelScanEntry>>({ data: finalResult[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/missing-parcels/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update parcel scan entry', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM parcel_scan_entries WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Parcel scan entry not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Parcel scan entry ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/missing-parcels/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete parcel scan entry', message: error.message, status: 500 });
  }
}
