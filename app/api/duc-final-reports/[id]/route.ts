
// app/api/duc-final-reports/[id]/route.ts
import { NextResponse } from 'next/server';
import type { 
    DUCFinalReport, FailedRound, SegregatedParcel, DUCReportAttachment, 
    MissingParcelDUCReportContext, ApiResponse 
} from '../../../../types';
import { query, getClient } from '../../../../lib/db';
import { handleFileUpload, deleteUploadedFileByRelativePath } from '../../../../lib/fileUpload';

interface RouteParams {
  params: { id: string };
}

// Define a more specific type for the raw row from the database if possible,
// or ensure proper casting/checking when accessing properties from `any`.
interface DUCFinalReportRawDBRow extends Omit<DUCFinalReport, 'failed_rounds' | 'segregated_parcels' | 'attachments' | 'total_returns'> {
  failed_rounds: FailedRound[]; // Assuming pg driver parses JSONB array to JS array
  segregated_parcels: SegregatedParcel[]; // Assuming pg driver parses JSONB array to JS array
  attachments: DUCReportAttachment[]; // Assuming pg driver parses JSONB array to JS array
  total_returns: number | string; // Can be string from DB
  // Include any other properties that might come directly from the DB query
  submitted_by_name?: string;
  sub_depot_name?: string;
  delivery_unit_name?: string;
}


export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const reportResult = await query<DUCFinalReportRawDBRow>(`
      SELECT 
        dfr.*,
        tm.name as submitted_by_name,
        sd.name as sub_depot_name,
        du.name as delivery_unit_name,
        COALESCE(
          (SELECT json_agg(fr.*) FROM duc_failed_rounds fr WHERE fr.duc_final_report_id = dfr.id),
          '[]'::json
        ) as failed_rounds,
        COALESCE(
          (SELECT json_agg(json_build_object('id', sp.id, 'duc_final_report_id', sp.duc_final_report_id, 'barcode', sp.barcode, 'client_id', sp.client_id, 'client_name', c.name, 'count', sp.count)) 
           FROM duc_segregated_parcels sp JOIN clients c ON sp.client_id = c.id
           WHERE sp.duc_final_report_id = dfr.id),
          '[]'::json
        ) as segregated_parcels,
        COALESCE(
          (SELECT json_agg(att.*) FROM duc_report_attachments att WHERE att.duc_final_report_id = dfr.id),
          '[]'::json
        ) as attachments
      FROM duc_final_reports dfr
      JOIN team_members tm ON dfr.submitted_by_team_member_id = tm.id
      LEFT JOIN sub_depots sd ON dfr.sub_depot_id = sd.id
      LEFT JOIN delivery_units du ON dfr.delivery_unit_id = du.id
      WHERE dfr.id = $1
    `, [id]);

    if (reportResult.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'DUC Final Report not found', status: 404 });
    }
    
    const rawReport = reportResult[0];
    const reportData: DUCFinalReport = {
        id: rawReport.id,
        date: rawReport.date,
        sub_depot_id: rawReport.sub_depot_id,
        delivery_unit_id: rawReport.delivery_unit_id,
        submitted_by_team_member_id: rawReport.submitted_by_team_member_id,
        submitted_at: rawReport.submitted_at,
        failed_rounds: rawReport.failed_rounds || [],
        total_returns: Number(rawReport.total_returns),
        segregated_parcels: rawReport.segregated_parcels || [],
        attachments: rawReport.attachments || [],
        notes: rawReport.notes,
        missing_parcels_summary: rawReport.missing_parcels_summary,
        is_approved: rawReport.is_approved,
        approved_by_team_member_id: rawReport.approved_by_team_member_id,
        approved_at: rawReport.approved_at,
        createdAt: rawReport.createdAt,
        updatedAt: rawReport.updatedAt,
        submitted_by_name: rawReport.submitted_by_name,
        sub_depot_name: rawReport.sub_depot_name,
        delivery_unit_name: rawReport.delivery_unit_name,
    };
    return NextResponse.json<ApiResponse<DUCFinalReport>>({ data: reportData, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/duc-final-reports/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch DUC final report', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  // This route is not fully implemented based on the prompt.
  // Placeholder to make the file valid.
  const { id } = params;
  console.log(`PUT /api/duc-final-reports/${id} called, but not fully implemented.`);
  return NextResponse.json<ApiResponse>({ message: 'Update not implemented yet.', status: 501 });
}
