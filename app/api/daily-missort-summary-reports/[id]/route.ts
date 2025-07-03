
// app/api/daily-missort-summary-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { DailyMissortSummaryReport, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

interface DailyMissortSummaryReportRawDBRow extends Omit<DailyMissortSummaryReport, 'missorts_by_client' | 'missorts_by_round' | 'total_missorts'> {
  missorts_by_client: Array<{ client_id: number; client_name?: string; count: number }>;
  missorts_by_round: Array<{ round_id: string; sub_depot_id: number; sub_depot_name?: string; count: number }>;
  total_missorts: number | string;
  submitted_by_name?: string;
  sub_depot_name_filter?: string;
}


export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<DailyMissortSummaryReportRawDBRow>(`
      SELECT 
        dmsr.*,
        tm.name as submitted_by_name,
        sd.name as sub_depot_name_filter 
      FROM duc_daily_missort_summary_reports dmsr
      LEFT JOIN team_members tm ON dmsr.submitted_by_team_member_id = tm.id
      LEFT JOIN sub_depots sd ON dmsr.sub_depot_id = sd.id
      WHERE dmsr.id = $1
    `, [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Daily Missort Summary Report not found', status: 404 });
    }
    const rawReport = result[0];
    const report: DailyMissortSummaryReport = {
        ...rawReport,
        total_missorts: Number(rawReport.total_missorts),
        missorts_by_client: rawReport.missorts_by_client || [],
        missorts_by_round: rawReport.missorts_by_round || [],
    };
    return NextResponse.json<ApiResponse<DailyMissortSummaryReport>>({ data: report, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/daily-missort-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch report', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<DailyMissortSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt'>> = await request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      const allowedColumns = ['date', 'sub_depot_id', 'total_missorts', 'missorts_by_client', 'missorts_by_round', 'notes', 'submitted_by_team_member_id'];
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        if (key === 'missorts_by_client' || key === 'missorts_by_round') {
            values.push(JSON.stringify(value));
        } else {
            values.push(value);
        }
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE duc_daily_missort_summary_reports SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<DailyMissortSummaryReportRawDBRow>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found or no changes made', status: 404 });
    }
    const updatedReportWithDetailsResult = await query<DailyMissortSummaryReportRawDBRow>(`
        SELECT dmsr.*, tm.name as submitted_by_name, sd.name as sub_depot_name_filter 
        FROM duc_daily_missort_summary_reports dmsr
        LEFT JOIN team_members tm ON dmsr.submitted_by_team_member_id = tm.id
        LEFT JOIN sub_depots sd ON dmsr.sub_depot_id = sd.id
        WHERE dmsr.id = $1
    `, [result[0].id]);

    const rawUpdatedReport = updatedReportWithDetailsResult[0];
     const finalReport: DailyMissortSummaryReport = {
        ...rawUpdatedReport,
        total_missorts: Number(rawUpdatedReport.total_missorts),
        missorts_by_client: rawUpdatedReport.missorts_by_client || [],
        missorts_by_round: rawUpdatedReport.missorts_by_round || [],
    };


    return NextResponse.json<ApiResponse<DailyMissortSummaryReport>>({ data: finalReport, status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/daily-missort-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update report', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM duc_daily_missort_summary_reports WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Daily Missort Summary Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/daily-missort-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete report', message: error.message, status: 500 });
  }
}
