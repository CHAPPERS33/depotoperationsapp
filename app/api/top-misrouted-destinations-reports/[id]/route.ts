// app/api/top-misrouted-destinations-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { TopMisroutedDestinationsReport, ApiResponse } from '../../../../types';
import  { query, getClient } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<TopMisroutedDestinationsReport>('SELECT * FROM duc_top_misrouted_destinations_reports WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<TopMisroutedDestinationsReport>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/top-misrouted-destinations-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch report', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM duc_top_misrouted_destinations_reports WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/top-misrouted-destinations-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete report', message: error.message, status: 500 });
  }
}
