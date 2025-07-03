// app/api/depot-open/route.ts
import { NextResponse } from 'next/server';
import type { DepotOpenRecord, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const { searchParams } = new URL(_request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Date parameter is required', status: 400 });
    }

    const records = await query<DepotOpenRecord>(
      'SELECT * FROM depot_open_records WHERE date = $1 ORDER BY sub_depot_id ASC NULLS FIRST, time ASC', 
      [date]
    );
    
    // The DepotOpenManager component in UI might expect DepotOpenApiResponseItem.
    // However, useSharedState and other parts might benefit from the full DepotOpenRecord.
    // For consistency and to provide full data, we'll return DepotOpenRecord structure.
    // The client-side can decide what to display.
    // If DepotOpenApiResponseItem is strictly needed by a consumer, that consumer should adapt.
    return NextResponse.json<ApiResponse<DepotOpenRecord[]>>({ data: records, status: 200 });

  } catch (error: any) {
    console.error('GET /api/depot-open Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch depot open records', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  const dbClient = await getClient();
  try {
    const body: Omit<DepotOpenRecord, 'id' | 'createdAt' | 'updatedAt'> = await _request.json();
    
    if (!body.date || !body.time) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Date and Time are required', status: 400});
    }

    await dbClient.query('BEGIN');

    // Using ON CONFLICT to handle potential unique constraint violations on (date, sub_depot_id)
    // COALESCE(sub_depot_id, -1) is used to handle NULLs in unique index properly if sub_depot_id can be null.
    // Assuming a unique index like: CREATE UNIQUE INDEX unique_depot_open_entry ON depot_open_records (date, COALESCE(sub_depot_id, -1));
    const result = await dbClient.query<DepotOpenRecord>(
      `INSERT INTO depot_open_records (date, time, notes, sub_depot_id, team_member_id) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (date, COALESCE(sub_depot_id, -1)) DO UPDATE SET
         time = EXCLUDED.time,
         notes = EXCLUDED.notes,
         team_member_id = EXCLUDED.team_member_id,
         updated_at = NOW()
       RETURNING *`,
      [body.date, body.time, body.notes, body.sub_depot_id, body.team_member_id]
    );
    
    await dbClient.query('COMMIT');

    if (result.rows.length === 0) {
        // This should not happen with ON CONFLICT DO UPDATE RETURNING * unless something is very wrong.
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create or update depot open record', status: 500});
    }
    return NextResponse.json<ApiResponse<DepotOpenRecord>>({ data: result.rows[0], status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/depot-open Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create or update depot open record', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
