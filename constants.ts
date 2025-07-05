

import { DeliveryUnit, SubDepot, Round, Courier, Client, Vehicle, DepotOpenRecord, WaveEntry, HHTAsset, HHTLogin, TimeslotTemplate, EmailTrigger, AlertConfig, ScanLog, AvailabilityRecord, CageAuditEntry, CageReturnReport, TeamMember, PayPeriod, Forecast, WorkSchedule, Invoice, DUCFinalReport, TimeslotAssignment, ScanActivity, ForecastActivity, RoundEntry, LostPreventionReport, DailyMissortSummaryReport, WeeklyMissingSummaryReport, WorstCourierPerformanceReport, WorstRoundPerformanceReport, ClientMissingLeagueReport, TopMisroutedDestinationsReport, WorstCourierCarryForwardReport } from './types';

export const TODAY_DATE_STRING = new Date().toISOString().slice(0, 10);
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
export const YESTERDAY_DATE_STRING = yesterday.toISOString().slice(0, 10);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
export const TOMORROW_DATE_STRING = tomorrow.toISOString().slice(0, 10);

export const YESTERDAY_DATE_STRING_GB = new Date(Date.now() - 86400000).toLocaleDateString('en-GB');
export const TODAY_DATE_STRING_GB = new Date().toLocaleDateString('en-GB');

// Aftership Constants (Placeholders - use environment variables in a real app)
export const AFTERSHIP_API_KEY = 'YOUR_AFTERSHIP_API_KEY_PLACEHOLDER'; 
export const EVRI_SLUG = 'evri';


// INITIAL DATA: These will now primarily serve as examples of structure or for UIs before API data loads,
// or for parts of the app that might still use some client-side mock data.
// For an API-driven app, these would ideally be empty arrays or fetched from the DB.

export const INITIAL_DELIVERY_UNITS_DATA: DeliveryUnit[] = [ { id: 'EDM', name: 'Edmonton Delivery Unit' }, { id: 'BRK', name: 'Barking Delivery Unit' }];
export const INITIAL_SUBDEPOTS_DATA: SubDepot[] = [ 
  { id: 71, name: 'Sub Depot 71 (Edmonton)', delivery_unit_id: 'EDM' }, 
  { id: 62, name: 'Sub Depot 62 (Edmonton)', delivery_unit_id: 'EDM' }, 
  { id: 66, name: 'Sub Depot 66 (Barking)', delivery_unit_id: 'BRK' }, 
  { id: 39, name: 'Sub Depot 39 (Barking)', delivery_unit_id: 'BRK' }, 
  { id: 76, name: 'Sub Depot 76 (Edmonton)', delivery_unit_id: 'EDM' }
];
export const INITIAL_ROUNDS_DATA: Round[] = [
  { id: "110028", sub_depot_id: 39, drop_number: 7, is_active: true }, { id: "110029", sub_depot_id: 39, drop_number: 8, is_active: true },
  { id: "1", sub_depot_id: 71, drop_number: 5, is_active: true }, { id: "2", sub_depot_id: 71, drop_number: 6, is_active: true },
];
export const INITIAL_COURIERS_DATA: Courier[] = [ { id: 'C001', name: 'Courier One', is_driver_for_team_member_id: 'TM001', telephone: '07123456789', is_active: true }, { id: 'C002', name: 'Courier Two', telephone: '07987654321', is_active: true }];
export const INITIAL_CLIENTS_DATA: Client[] = [ { id: 1, name: 'Amazon', is_high_priority: false }, { id: 2, name: 'ASOS', is_high_priority: true }];
export const INITIAL_VEHICLES_DATA: Vehicle[] = [ { id: 'V1', registration: 'LG21XYZ', type: 'Van', notes: 'Main run van', is_active: true }];
export const INITIAL_DEPOT_OPEN_RECORDS_DATA: DepotOpenRecord[] = [ { id: `global-${TODAY_DATE_STRING}`, date: TODAY_DATE_STRING, time: '07:00', notes: 'Today standard open', sub_depot_id: null }];
export const INITIAL_WAVES_DATA: WaveEntry[] = [ { id: 'WAVE001', van_reg: 'LG21XYZ', vehicle_type: 'Van', date: TODAY_DATE_STRING, time: '08:00', pallet_count: 10, photo_url: '/uploads/waves/sample.jpg' }];
export const INITIAL_HHT_ASSETS_DATA: HHTAsset[] = [  { serial_number: 'HHT001', assigned_to_team_member_id: 'TM001', status: 'Active', last_service_date: YESTERDAY_DATE_STRING }];
export const INITIAL_HHT_LOGINS_DATA: HHTLogin[] = [ { login_id: 'L001', pin_hash: 'hashed_pin_1234', sub_depot_id: 71, notes: 'Main login for S71', is_active: true }];
export const INITIAL_SCAN_LOGS_DATA: ScanLog[] = [ { id: 'SCAN001', date: TODAY_DATE_STRING, user_id_team_member: 'TM001', sub_depot_id: 71, hht_login_id: 'L001', total_scanned: 500, hht_serial: 'HHT001', notes: 'Morning scan' } ];
export const INITIAL_TIMESLOT_TEMPLATES_DATA: TimeslotTemplate[] = [ { id: 'EDM_STANDARD', name: 'Edmonton Standard (Mon-Sat)', sub_depot_id: 0, slots: ['09:15', '10:00'], max_capacity_per_slot: 40, is_default: true }];
export const INITIAL_EMAIL_TRIGGERS_DATA: EmailTrigger[] = [ { id: 'trigger-duc-daily', name: 'Daily DUC Final Report to Ops', report_type: 'duc_final_report', frequency: 'daily', send_time: '19:00', recipients: ['operations@example.com'], sub_depot_id_filter: 'all', is_enabled: true, createdAt: '2024-07-20T10:00:00Z', last_sent_at: YESTERDAY_DATE_STRING + 'T19:00:00Z' }];
export const INITIAL_ALERT_CONFIGS_DATA: AlertConfig[] = [ { id: 'alert-1', title: 'Overdue Reports', description: 'DUC final report not submitted', severity: 'high', isActive: true, conditions: [{ type: 'time_based', value: '20:00' }], recipients: ['manager@example.com'] }];
export const INITIAL_TEAM_MEMBERS_DATA: TeamMember[] = [ { id: 'TM001', name: 'John Smith', position: 'Sorter', email: 'john.smith@example.com', delivery_unit_id: 'EDM', sub_depot_id: 71, hourly_rate: 12.75, is_active: true }];
export const INITIAL_PAY_PERIODS_DATA: PayPeriod[] = [ { id: 'PP2024_03', period_number: 3, year: 2024, start_date: '2024-03-01', end_date: '2024-03-31', status: 'Open', createdAt: '2024-04-01T10:00:00Z', updatedAt: '2024-04-01T10:00:00Z' }];
export const INITIAL_FORECASTS_DATA: Forecast[] = [ { id: 'FCAST002', forecast_for_date: TODAY_DATE_STRING, pay_period_id: 'PP2024_03', total_volume: 2500, calculated_hours: 8.33, planned_shift_length: 8.5, notes: 'Standard day', volumes: [{id: 1, forecast_id: 'FCAST002', sub_depot_id: 71, volume: 1500, sub_depot_name: 'Sub Depot 71 (Edmonton)' }] }];
export const INITIAL_WORK_SCHEDULES_DATA: WorkSchedule[] = [ { id: 'WS001', date: TODAY_DATE_STRING, team_member_id: 'TM001', sub_depot_id: 71, forecast_id: 'FCAST002', scheduled_hours: 8, actual_hours: 8, shift_start_time: '07:00', shift_end_time: '15:30', is_confirmed: true, team_member_name: 'John Smith', sub_depot_name: 'Sub Depot 71 (Edmonton)' }];
export const INITIAL_INVOICES_DATA: Invoice[] = [ { id: 'INV002', pay_period_id: 'PP2024_02', team_member_id: 'TM002', invoice_number: 'INV-2024-002', invoice_date: '2024-03-01', due_date: '2024-03-15', lines: [{ id: 1, invoice_id: 'INV002', date: '2024-02-10', description: 'DUC services', hours: 35, rate: 14.00, amount: 490, type: 'Regular' }], total_hours: 35, total_amount: 490, status: 'Draft', team_member_name: 'Sarah Jones', pay_period_info: '2/2024' }];
export const INITIAL_MISSING_PARCELS_LOG_DATA: RoundEntry[] = [ { 
  id: 'mp1-scan-entry', logId: 'mp1', barcode: '1234567890123456', courier_id: 'C001', round_id: "1", drop_number: 5, sub_depot_id: 71, 
  sorter_team_member_id: 'TM001', client_id: 1, time_scanned: `${TODAY_DATE_STRING}T10:30:00Z`, is_recovered: false, 
  dateAdded: TODAY_DATE_STRING_GB, scan_type: 'Standard', noScans: 0, carryForwards: 0
}];
export const INITIAL_SCAN_ACTIVITY_DATA: ScanActivity[] = [ { date: TODAY_DATE_STRING_GB, userId: 'TM001', userType: 'Sorter', userName: 'John Smith', subDepot: 71, totalScanned: 1450, timeCompleted: '13:45', missorts: 3 }];
export const INITIAL_FORECAST_ACTIVITY_DATA: ForecastActivity[] = [ { date: TODAY_DATE_STRING_GB, subDepot: 71, forecast: 1500, actual: 1450 }];
export const INITIAL_DUC_FINAL_REPORTS_DATA: DUCFinalReport[] = [ { 
  id: `DUC-${YESTERDAY_DATE_STRING}`, date: YESTERDAY_DATE_STRING, submitted_by_team_member_id: 'TestUser01', submitted_at: new Date(Date.now() - 86400000).toISOString(), 
  failed_rounds: [{id: 1, duc_final_report_id: `DUC-${YESTERDAY_DATE_STRING}`, round_id: "3", sub_depot_id: 71, comments: "Late start" }], 
  total_returns: 15, segregated_parcels: [{id: 1, duc_final_report_id: `DUC-${YESTERDAY_DATE_STRING}`, barcode: "SEGXYZ001", client_id: 2, count: 1, client_name: 'ASOS' }], 
  notes: "Smooth ops.", 
  missing_parcels_summary: { 
    total_missing: 1, unrecovered: 1, recovery_rate: 0, 
    parcels: [{ barcode: '1234567890123456', courier_id: 'C001', round_id: "1", drop_number: 5, sub_depot_id: 71, sorter_id: 'TM001', client_id: 1, time_scanned: `${YESTERDAY_DATE_STRING}T10:30:00Z`, recovered: false, scan_entry_id: 'mp1-scan-entry' }]
  } 
}];
export const INITIAL_TIMESLOT_ASSIGNMENTS_DATA: TimeslotAssignment[] = [ { id: 'TSA001', round_id: "1", sub_depot_id: 71, date: TODAY_DATE_STRING, timeslot: '09:15' }];
export const INITIAL_AVAILABILITY_RECORDS_DATA: AvailabilityRecord[] = [ { id: `TM001-${TODAY_DATE_STRING}`, team_member_id: 'TM001', date: TODAY_DATE_STRING, status: 'Available', notes: 'Ready for OT' }];
export const INITIAL_CAGE_AUDITS_DATA: CageAuditEntry[] = [ { 
  id: 'CA001', date: YESTERDAY_DATE_STRING, team_member_id: 'TM002', sub_depot_id: 71, round_id: "1", drop_number: 5, 
  total_parcels_in_cage: 120, total_missorts_found: 1,
  missorted_parcels: [{ id: 1, cage_audit_id: 'CA001', barcode: 'MISSORT001', client_id: 2, client_name: 'ASOS' }], 
  images: [], missortImageUrls: [], 
  createdAt: new Date(Date.now() - 86400000).toISOString(), notes: 'One missort found.' 
}];
export const INITIAL_CAGE_RETURN_REPORTS_DATA: CageReturnReport[] = [ { 
  id: `${YESTERDAY_DATE_STRING}-71`, date: YESTERDAY_DATE_STRING, sub_depot_id: 71, 
  non_returned_cages: [{id: 1, cage_return_report_id: `${YESTERDAY_DATE_STRING}-71`, round_id: "3", courier_id: "C001", courier_name: "Courier One" }], 
  submitted_at: new Date(Date.now() - 86400000).toISOString(), submitted_by_team_member_id: "TestUser01", notes: "C001 forgot cage." 
}];
export const INITIAL_LOST_PREVENTION_REPORTS_DATA: LostPreventionReport[] = [ { 
  id: 'LP001', date_of_incident: YESTERDAY_DATE_STRING, submitted_by_team_member_id: 'TestUser02', 
  submitted_at: new Date(Date.now() - 86400000).toISOString(), courier_id: 'C001', courier_name: 'Courier One', 
  round_ids: ["1"], incident_description: 'Parcel mishandling.', cctv_viewed: true, van_search_conducted: false, status: 'Open'
}];
export const INITIAL_DAILY_MISSORT_SUMMARY_REPORTS_DATA: DailyMissortSummaryReport[] = [ { 
  id: `DMS-${YESTERDAY_DATE_STRING}`, date: YESTERDAY_DATE_STRING, sub_depot_id: 71, total_missorts: 1, 
  missorts_by_client: [{ client_id: 2, client_name: 'ASOS', count: 1 }], 
  missorts_by_round: [{ round_id: '1', sub_depot_id: 71, sub_depot_name: 'Sub Depot 71 (Edmonton)', count: 1 }], 
  submitted_at: new Date(Date.now() - 86400000).toISOString(), submitted_by_team_member_id: 'System' 
}];
export const INITIAL_WEEKLY_MISSING_SUMMARY_REPORTS_DATA: WeeklyMissingSummaryReport[] = [];
export const INITIAL_WORST_COURIER_PERFORMANCE_REPORTS_DATA: WorstCourierPerformanceReport[] = [];
export const INITIAL_WORST_ROUND_PERFORMANCE_REPORTS_DATA: WorstRoundPerformanceReport[] = [];
export const INITIAL_CLIENT_MISSING_LEAGUE_REPORTS_DATA: ClientMissingLeagueReport[] = [];
export const INITIAL_TOP_MISROUTED_DESTINATIONS_REPORTS_DATA: TopMisroutedDestinationsReport[] = [];
export const INITIAL_WORST_COURIER_CARRY_FORWARD_REPORTS_DATA: WorstCourierCarryForwardReport[] = [];