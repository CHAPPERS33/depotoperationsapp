
// app/api/weekly-missing-summary-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { WeeklyMissingSummaryReport, ApiResponse, WeeklyMissingSummaryParcelDetail } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

interface WeeklyMissingSummaryReportRawDBRow extends Omit<WeeklyMissingSummaryReport, 'missing_by_client' | 'parcels_summary' | 'total_missing'> {
  missing_by_client: Array<{ client_id: number; client_name?: string; count: number }>;
  parcels_summary: WeeklyMissingSummaryParcelDetail[];
  total_missing: number | string;
  generated_by_name?: string;
}


export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<WeeklyMissingSummaryReportRawDBRow>(`
      SELECT 
        wmsr.*,
        tm.name as generated_by_name
      FROM duc_weekly_missing_summary_reports wmsr
      LEFT JOIN team_members tm ON wmsr.generated_by_team_member_id = tm.id
      WHERE wmsr.id = $1
    `, [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Weekly Missing Summary Report not found', status: 404 });
    }
    const rawReport = result[0];
    const report: WeeklyMissingSummaryReport = {
        ...rawReport,
        total_missing: Number(rawReport.total_missing),
        missing_by_client: rawReport.missing_by_client || [],
        parcels_summary: rawReport.parcels_summary || [],
    };
    return NextResponse.json<ApiResponse<WeeklyMissingSummaryReport>>({ data: report, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/weekly-missing-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch report', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<WeeklyMissingSummaryReport, 'id' | 'generated_at' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      const allowedColumns = ['week_start_date', 'week_end_date', 'total_missing', 'missing_by_client', 'parcels_summary', 'notes', 'generated_by_team_member_id'];
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        if (key === 'missing_by_client' || key === 'parcels_summary') {
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
    const queryString = `UPDATE duc_weekly_missing_summary_reports SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<WeeklyMissingSummaryReportRawDBRow>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Report not found or no changes made', status: 404 });
    }
    const updatedReportWithDetailsResult = await query<WeeklyMissingSummaryReportRawDBRow>(`
        SELECT wmsr.*, tm.name as generated_by_name
        FROM duc_weekly_missing_summary_reports wmsr
        LEFT JOIN team_members tm ON wmsr.generated_by_team_member_id = tm.id
        WHERE wmsr.id = $1
    `, [result[0].id]);

    const rawUpdatedReport = updatedReportWithDetailsResult[0];
    const finalReport: WeeklyMissingSummaryReport = {
        ...rawUpdatedReport,
        total_missing: Number(rawUpdatedReport.total_missing),
        missing_by_client: rawUpdatedReport.missing_by_client || [],
        parcels_summary: rawUpdatedReport.parcels_summary || [],
    };
    return NextResponse.json<ApiResponse<WeeklyMissingSummaryReport>>({ data: finalReport, status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/weekly-missing-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update report', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM duc_weekly_missing_summary_reports WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Weekly Missing Summary Report not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Report ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/weekly-missing-summary-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete report', message: error.message, status: 500 });
  }
}
