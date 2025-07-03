
// app/api/sub-depots/[id]/route.ts
import { NextResponse } from 'next/server';
import type { SubDepot, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string }; // SubDepot ID is number, but route params are string
}

export async function GET(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Sub Depot ID format', status: 400 });
  }
  try {
    const result = await query<SubDepot>('SELECT * FROM sub_depots WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Sub depot not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<SubDepot>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/sub-depots/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch sub depot', message: (error as Error).message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Sub Depot ID format', status: 400 });
  }
  try {
    const body: Partial<Omit<SubDepot, 'id' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = ['name', 'delivery_unit_id', 'location_description'];

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
    const queryString = `UPDATE sub_depots SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<SubDepot>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Sub depot not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<SubDepot>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/sub-depots/${id} Error:`, error);
    if ((error as any).code === '23503') { // Foreign key violation for delivery_unit_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update sub depot', message: 'Invalid Delivery Unit ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update sub depot', message: (error as Error).message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid Sub Depot ID format', status: 400 });
  }
  try {
    // Add checks for dependencies here if needed (e.g., rounds, team_members, parcel_scan_entries)
    const dependentTables = [
        { table: 'rounds', column: 'sub_depot_id', name: 'Rounds' },
        { table: 'team_members', column: 'sub_depot_id', name: 'Team Members' },
        { table: 'hht_logins', column: 'sub_depot_id', name: 'HHT Logins' },
        { table: 'parcel_scan_entries', column: 'sub_depot_id', name: 'Parcel Scans'},
        // Add other tables as needed
    ];
    for (const dep of dependentTables) {
        const refs = await query(`SELECT 1 FROM ${dep.table} WHERE ${dep.column} = $1 LIMIT 1`, [id]);
        if (refs.length > 0) {
            return NextResponse.json<ApiResponse<null>>({ error: `Cannot delete Sub Depot`, message: `This Sub Depot is referenced by existing ${dep.name}.`, status: 409});
        }
    }

    const result = await query('DELETE FROM sub_depots WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Sub depot not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Sub depot ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/sub-depots/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete sub depot', message: (error as Error).message, status: 500 });
  }
}
