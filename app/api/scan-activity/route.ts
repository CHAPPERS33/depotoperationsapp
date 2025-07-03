// app/api/scan-activity/route.ts
import { NextResponse } from 'next/server';
import type { ScanActivity, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
function convertDateToYYYYMMDD(dateStr: string): string | null {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  // Try to parse if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return null;
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(_request.url);
    const dateParam = searchParams.get('date'); // Expected as DD/MM/YYYY from client (TODAY_DATE_STRING_GB)
    const userId = searchParams.get('userId');

    if (!dateParam) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Date parameter is required', status: 400 });
    }

    const queryDate = convertDateToYYYYMMDD(dateParam);
    if (!queryDate) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD.', status: 400 });
    }

    let sqlQuery = `
      SELECT
        to_char(sl.date, 'DD/MM/YYYY') as date,
        sl.user_id_team_member as "userId",
        tm.position as "userType",
        tm.name as "userName",
        sl.sub_depot_id as "subDepot",
        sd.name as "subDepotName",
        SUM(sl.total_scanned)::integer as "totalScanned",
        MAX(sl.scan_end_time)::text as "timeCompleted", 
        SUM(COALESCE(sl.missorts, 0))::integer as missorts
      FROM scan_logs sl
      JOIN team_members tm ON sl.user_id_team_member = tm.id
      JOIN sub_depots sd ON sl.sub_depot_id = sd.id
      WHERE sl.date = $1
    `;
    const queryParams: any[] = [queryDate];

    if (userId) {
      sqlQuery += ` AND sl.user_id_team_member = $${queryParams.length + 1}`;
      queryParams.push(userId);
    }

    sqlQuery += `
      GROUP BY sl.date, sl.user_id_team_member, tm.position, tm.name, sl.sub_depot_id, sd.name
      ORDER BY sl.date DESC, MAX(sl.scan_end_time) DESC;
    `;
    
    const result = await query<ScanActivity>(sqlQuery, queryParams);
    
    return NextResponse.json<ApiResponse<ScanActivity[]>>({ data: result, status: 200 });
  } catch (error: any) {
    console.error('GET /api/scan-activity Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch scan activity', message: error.message, status: 500 });
  }
}
