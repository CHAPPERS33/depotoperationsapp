// app/api/missing-parcels/route.ts
import { NextResponse } from 'next/server';
import type { ParcelScanEntry, ApiResponse } from '../../../../types';
import { query, getClient } from '../../../lib/db';

// Helper function to build the SELECT query with joins
const buildSelectQuery = (whereClause: string = "", params: any[] = []) => {
  return {
    text: `
      SELECT 
        pse.*,
        c.name as client_name,
        cr.name as courier_name,
        tm.name as sorter_name,
        to_char(pse.created_at, 'DD/MM/YYYY') as "dateAdded" -- Mimic RoundEntry's dateAdded
      FROM parcel_scan_entries pse
      LEFT JOIN clients c ON pse.client_id = c.id
      LEFT JOIN couriers cr ON pse.courier_id = cr.id
      LEFT JOIN team_members tm ON pse.sorter_team_member_id = tm.id
      ${whereClause}
      ORDER BY pse.created_at DESC
    `,
    values: params
  };
};


export async function GET(_request: Request) {
  try {
    const { searchParams } = new URL(_request.url);
    // Example filter parameters (can be extended)
    const courierId = searchParams.get('courier_id');
    const roundId = searchParams.get('round_id');
    const dateAdded = searchParams.get('dateAdded'); // Expects DD/MM/YYYY format

    let whereClause = "";
    const params: any[] = [];
    let paramIndex = 1;

    if (courierId) {
      whereClause += ` ${whereClause ? 'AND' : 'WHERE'} pse.courier_id = $${paramIndex++}`;
      params.push(courierId);
    }
    if (roundId) {
      whereClause += ` ${whereClause ? 'AND' : 'WHERE'} pse.round_id = $${paramIndex++}`;
      params.push(roundId);
    }
    if (dateAdded) {
      // Convert DD/MM/YYYY to YYYY-MM-DD for DB query on created_at::date
      const parts = dateAdded.split('/');
      if (parts.length === 3) {
        const yyyymmdd = `${parts[2]}-${parts[1]}-${parts[0]}`;
        whereClause += ` ${whereClause ? 'AND' : 'WHERE'} DATE(pse.created_at) = $${paramIndex++}`;
        params.push(yyyymmdd);
      }
    }
    
    const { text, values } = buildSelectQuery(whereClause, params);
    const parcelEntries = await query<ParcelScanEntry>(text, values);
    return NextResponse.json<ApiResponse<ParcelScanEntry[]>>({ data: parcelEntries, status: 200 });
  } catch (error: any) {
    console.error('GET /api/missing-parcels Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch parcel scan entries', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const parcelDataInput: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'> | Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>[] = await _request.json();
    
    const processParcel = async (p: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ParcelScanEntry> => {
      const result = await query<ParcelScanEntry>(
        `INSERT INTO parcel_scan_entries (
           round_id, drop_number, sub_depot_id, courier_id, barcode, sorter_team_member_id, 
           client_id, time_scanned, scan_type, cfwd_courier_id, misrouted_du_id, 
           rejected_courier_id, is_recovered, recovery_date, recovery_notes, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          p.round_id, p.drop_number, p.sub_depot_id, p.courier_id, p.barcode, p.sorter_team_member_id,
          p.client_id, p.time_scanned, p.scan_type, p.cfwd_courier_id, p.misrouted_du_id,
          p.rejected_courier_id, p.is_recovered === undefined ? false : p.is_recovered, 
          p.recovery_date, p.recovery_notes, p.notes
        ]
      );
      if (result.length === 0) throw new Error('Failed to insert parcel scan entry.');
      
      // Fetch with joins to populate names for the response
      const { text, values } = buildSelectQuery('WHERE pse.id = $1', [result[0].id]);
      const detailedResult = await query<ParcelScanEntry>(text, values);
      return detailedResult[0];
    };

    if (Array.isArray(parcelDataInput)) {
      const newParcels = await Promise.all(parcelDataInput.map(p => processParcel(p)));
      return NextResponse.json<ApiResponse<ParcelScanEntry[]>>({ data: newParcels, status: 201 });
    } else {
      const newParcel = await processParcel(parcelDataInput);
      return NextResponse.json<ApiResponse<ParcelScanEntry>>({ data: newParcel, status: 201 });
    }

  } catch (error: any) {
    console.error('POST /api/missing-parcels Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to add parcel scan entry/entries', message: error.message, status: 500 });
  }
}
