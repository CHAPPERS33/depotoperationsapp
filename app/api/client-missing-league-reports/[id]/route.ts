// app/api/client-missing-league-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { ClientMissingLeagueReport, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<ClientMissingLeagueReport>('SELECT * FROM duc_client_missing_league_reports WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<ClientMissingLeagueReport>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/client-missing-league-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch report', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM duc_client_missing_league_reports WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/client-missing-league-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete report', message: error.message, status: 500 });
  }
}
