// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import type { DatabaseStatusCounts, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

async function getTableCounts(): Promise<DatabaseStatusCounts> {
  const tables = [
    'delivery_units', 'sub_depots', 'team_members', 'rounds', 'couriers', 'clients', 'vehicles',
    'depot_open_records', 'waves', 'hht_assets', 'hht_logins', 'scan_logs', 'parcel_scan_entries',
    'pay_periods', 'forecasts', 'forecast_volumes', 'work_schedules', 'invoice_lines', 'invoices',
    'duc_final_reports', 'duc_failed_rounds', 'duc_segregated_parcels', 'duc_report_attachments',
    'timeslot_templates', 'timeslot_assignments', 'email_triggers', 'availability_records',
    'cage_audits', 'cage_audit_missorted_parcels', 'cage_audit_images',
    'duc_cage_return_reports', 'duc_non_returned_cages',
    'duc_lost_prevention_reports', 'duc_lost_prevention_report_attachments', 'duc_lost_prevention_report_rounds',
    'duc_daily_missort_summary_reports', 'duc_weekly_missing_summary_reports',
    'duc_worst_courier_performance_reports', 'duc_worst_round_performance_reports',
    'duc_client_missing_league_reports', 'duc_top_misrouted_destinations_reports',
    'duc_worst_courier_carry_forward_reports'
  ];
  const counts: DatabaseStatusCounts = {};
  for (const table of tables) {
    try {
      const res = await query<{ count: string }>(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = { count: parseInt(res[0].count, 10) };
    } catch (e) {
      console.warn(`Could not get count for table ${table}: ${(e as Error).message}`);
      counts[table] = { count: -1 }; // Indicate error or table not found
    }
  }
  return counts;
}

export async function GET(request: Request) {
  try {
    const counts = await getTableCounts();
    return NextResponse.json<ApiResponse<DatabaseStatusCounts>>({ data: counts, status: 200 });
  } catch (error: any) {
    console.error('GET /api/seed (Database Status) Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to get database status', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Actual database seeding is a destructive operation and should be handled with extreme care,
    // typically via CLI scripts or migration tools, not an open API endpoint in production.
    // For development, one might implement a conditional seed here.
    // For now, returning a message indicating it's not implemented for safety.
    console.warn('POST /api/seed - Database seeding via API received. This is a placeholder and does not perform destructive actions.');
    const counts = await getTableCounts(); // Return current counts after "seeding" (which does nothing here)
    return NextResponse.json<ApiResponse<DatabaseStatusCounts>>(
        { 
            message: 'Database seeding via API is a placeholder. No data was changed. Current counts returned.', 
            data: counts,
            status: 200 
        }
    );
  } catch (error: any) {
    console.error('POST /api/seed (Seed Database) Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to process seed request', message: error.message, status: 500 });
  }
}
