

import { LucideIcon } from 'lucide-react';

// DB Schema Aligned Types

export type Position = 'Sorter' | 'DUC' | 'Marshall' | 'Admin' | 'Manager'; // Added Admin, Manager

export interface DeliveryUnit { 
  id: string; // PK, typically a short code like 'EDM'
  name: string; 
  address?: string | null;
  contact_email?: string | null;
  createdAt?: string; // TIMESTAMPTZ
  updatedAt?: string; // TIMESTAMPTZ
}

export interface SubDepot { 
  id: number; // SERIAL PK
  name: string; 
  delivery_unit_id: string; // FK to delivery_units (No longer optional based on usage)
  location_description?: string | null;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface TeamMember { 
  id: string; // PK, e.g., TM001 or UUID
  name: string; 
  position: Position; 
  email?: string | null; // UNIQUE
  phone_number?: string | null;
  delivery_unit_id?: string | null; // FK to delivery_units
  sub_depot_id?: number | null; // FK to sub_depots (location_sub_depot_id from schema)
  is_driver_for_team_member_id?: string | null; // Self-referential FK
  hourly_rate?: number | null; 
  password_hash?: string | null; // For potential future auth
  is_active: boolean;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Round { 
  id: string; // PK, e.g., R110028
  sub_depot_id: number; // FK to sub_depots
  drop_number: number; 
  round_name?: string | null; // Descriptive name
  is_active: boolean;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Courier { 
  id: string; // PK, e.g., C001
  name: string; 
  is_driver_for_team_member_id?: string | null; // FK to team_members
  notes?: string | null; 
  telephone?: string | null; 
  is_active: boolean;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Client { 
  id: number; // SERIAL PK
  name: string; // UNIQUE
  code?: string | null; // UNIQUE
  is_high_priority: boolean; 
  contact_person?: string | null;
  contact_email?: string | null;
  createdAt?: string; 
  updatedAt?: string; 
}

export type VehicleType = 'Artic' | 'Rigid' | 'Van' | 'LGV' | 'HGV' | 'Motorbike' | 'Bicycle' | 'Other'; // Expanded
export interface Vehicle { 
  id: string; // PK, e.g., V1 or UUID
  registration: string; // UNIQUE
  type: VehicleType; 
  notes?: string | null; 
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  is_active: boolean;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface DepotOpenRecord {
  id: string; // UUID PK
  date: string; // DATE
  time: string; // TIME
  notes?: string | null;
  sub_depot_id?: number | null; // FK to sub_depots, NULL for global
  team_member_id?: string | null; // FK to team_members (who recorded it)
  createdAt?: string; 
  updatedAt?: string; 
}

export interface WaveEntry { 
  id: string; // UUID PK
  van_reg: string; // Can be FK to vehicles.registration if strict, or just text
  vehicle_type: VehicleType; 
  date: string; // DATE
  time: string; // TIME
  pallet_count: number; 
  photo_url?: string | null; // Path to photo
  notes?: string | null;
  sub_depot_id?: number | null; // FK to sub_depots
  team_member_id?: string | null; // FK to team_members
  createdAt?: string; 
  updatedAt?: string; 
}

export interface HHTAsset { 
  serial_number: string; // PK
  assigned_to_team_member_id?: string | null; // FK to team_members
  status: 'Active' | 'Repair' | 'Retired' | 'Lost'; // Added 'Lost'
  last_service_date?: string | null; // DATE
  purchase_date?: string | null; // DATE
  model_number?: string | null;
  notes?: string | null;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface HHTLogin { 
  login_id: string; // PK
  pin_hash: string; // Store hashed PINs
  sub_depot_id: number; // FK to sub_depots
  notes?: string | null; 
  is_active: boolean;
  createdAt?: string; 
  updatedAt?: string; 
  // For forms, you'll use a 'pin' field, not pin_hash directly
}

export interface ScanLog { 
  id: string; // UUID PK
  date: string; // DATE
  user_id_team_member: string; // FK to team_members
  sub_depot_id: number; // FK to sub_depots
  hht_login_id: string; // FK to hht_logins
  hht_serial: string; // FK to hht_assets.serial_number
  total_scanned: number; 
  missorts?: number | null;
  scan_start_time?: string | null; // TIME
  scan_end_time?: string | null; // TIME
  photo_url?: string | null; 
  notes?: string | null; 
  createdAt?: string; 
  updatedAt?: string; 
}

// This type represents the detailed parcel scan entries, not just a summary log
export interface ParcelScanEntry { 
  id: string; // UUID PK
  round_id: string; // FK to rounds
  drop_number: number; // From round_id for context, or direct
  sub_depot_id: number; // FK to sub_depots
  courier_id?: string | null; // FK to couriers
  barcode: string; 
  sorter_team_member_id: string; // FK to team_members
  client_id: number; // FK to clients
  time_scanned: string; // TIMESTAMPTZ
  scan_type: 'Standard' | 'NoScan' | 'CarryForward' | 'Misrouted' | 'Rejected';
  cfwd_courier_id?: string | null; // FK to couriers
  misrouted_du_id?: string | null; // FK to delivery_units
  rejected_courier_id?: string | null; // FK to couriers
  is_recovered: boolean; 
  recovery_date?: string | null; // DATE
  recovery_notes?: string | null;
  notes?: string | null;
  created_at?: string; // TIMESTAMPTZ
  updated_at?: string; // TIMESTAMPTZ

  // For UI convenience, these might be populated by joins or lookups
  client_name?: string;
  courier_name?: string;
  sorter_name?: string;
}

// RoundEntry type for Missing Parcels Log UI should map to ParcelScanEntry
export type RoundEntry = ParcelScanEntry & { 
  logId?: string; // UI specific key, if different from ParcelScanEntry.id
  dateAdded?: string; // UI specific for grouping/display
  // Custom fields used in UI that are not part of ParcelScanEntry schema:
  noScans?: number; 
  carryForwards?: number; 
  // misrouted and rejectedParcels are represented by scan_type potentially, or need specific handling
  // If these are distinct numeric counts, they should be here.
  // The code in MissingParcelsWorkflow uses misrouted and rejectedParcels as numbers.
  // For now, let's assume they are part of the UI/form data and not directly from ParcelScanEntry model.
  // The initial data also uses them.
};

export interface PayPeriod { 
  id: string; // UUID PK
  period_number: number; 
  year: number; 
  start_date: string; // DATE
  end_date: string; // DATE
  status: 'Open' | 'Closed' | 'Invoiced' | 'Paid' | 'Archived'; // Added Archived
  createdAt?: string; 
  updatedAt?: string; 
}

export interface ForecastVolume { 
  id: number; // SERIAL PK
  forecast_id: string; // FK to forecasts
  sub_depot_id: number; // FK to sub_depots
  volume: number; 
  notes?: string | null;
  // For UI:
  sub_depot_name?: string; 
}

export interface Forecast { 
  id: string; // UUID PK
  forecast_for_date: string; // DATE
  pay_period_id?: string | null; // FK to pay_periods
  total_volume?: number | null; 
  calculated_hours?: number | null; 
  planned_shift_length?: number | null; 
  notes?: string | null; 
  createdAt?: string; 
  updatedAt?: string; 
  volumes?: ForecastVolume[]; // For nested data
  // For UI:
  pay_period_info?: string; 
}

export interface WorkSchedule { 
  id: string; // UUID PK
  date: string; // DATE
  team_member_id: string; // FK to team_members
  sub_depot_id: number; // FK to sub_depots
  forecast_id?: string | null; // FK to forecasts
  scheduled_hours: number; 
  actual_hours?: number | null; 
  shift_start_time?: string | null; // TIME
  shift_end_time?: string | null; // TIME
  is_confirmed: boolean; 
  notes?: string | null; 
  createdAt?: string; 
  updatedAt?: string; 
  // For UI:
  team_member_name?: string; 
  sub_depot_name?: string; 
}

export interface InvoiceLine { 
  id: number; // SERIAL PK
  invoice_id: string; // FK to invoices
  work_schedule_id?: string | null; // FK to work_schedules
  date: string; // DATE
  description: string; 
  hours: number; 
  rate: number; 
  amount: number; 
  type: 'Regular' | 'Overtime' | 'Adjustment' | 'Bonus' | 'Expense' | 'Standby'; // Added Standby
}

export interface Invoice { 
  id: string; // UUID PK
  pay_period_id: string; // FK to pay_periods
  team_member_id: string; // FK to team_members
  invoice_number?: string | null; // UNIQUE
  invoice_date: string; // DATE
  due_date?: string | null; // DATE
  lines: InvoiceLine[]; // Changed from optional for consistency with usage
  sub_total_amount?: number; 
  vat_amount?: number | null;
  total_hours: number; 
  total_amount: number; 
  status: 'Draft' | 'Sent' | 'Paid' | 'Void' | 'Overdue'; // Added Overdue
  paid_date?: string | null; // DATE
  payment_method?: string | null;
  notes?: string | null; 
  attachment_url?: string | null; // Path to invoice PDF file
  createdAt?: string; 
  updatedAt?: string; 
  // For UI:
  team_member_name?: string; 
  pay_period_info?: string; 
}

export interface FailedRound { 
  id: number; // SERIAL PK
  duc_final_report_id: string; // FK
  round_id: string; // FK 
  sub_depot_id: number; // From Round for context, FK to sub_depots
  drop_number?: number; // From Round for context
  comments: string;
}

export interface SegregatedParcel { 
  id: number; // SERIAL PK
  duc_final_report_id: string; // FK
  barcode: string; 
  client_id: number; // FK
  count: number; 
  // For UI:
  client_name?: string;
}

// This type is for the JSONB field in DUCFinalReport, not a separate table.
export interface MissingParcelDUCReportContext { 
  barcode: string; 
  courier_id: string; 
  round_id: string; 
  drop_number: number; 
  sub_depot_id: number; 
  sorter_id: string; 
  time_scanned: string; // ISO timestamp from parcel_scan_entries
  recovered: boolean; // is_recovered from ParcelScanEntry
  client_id: number; 
  scan_entry_id: string; // Reference to the original parcel_scan_entries.id
  // For UI:
  courier_name?: string;
  sub_depot_name?: string;
  sorter_name?: string;
  client_name?: string;
}

export interface DUCReportAttachment {
  id: number; // SERIAL PK
  duc_final_report_id: string; // FK
  file_name: string;
  file_path: string; // Relative path from /public/uploads
  public_url: string; // Publicly accessible URL
  mime_type?: string | null;
  file_size_bytes?: number | null;
  uploaded_at?: string; // TIMESTAMPTZ
}

export interface DUCFinalReport {
  id: string; // PK e.g., DUC-YYYY-MM-DD-SUBDEPOTID or UUID
  date: string; // DATE
  sub_depot_id?: number | null; // FK to sub_depots (optional if report is global for DU)
  delivery_unit_id?: string | null; // FK to delivery_units (if global for DU)
  submitted_by_team_member_id: string; // FK
  submitted_at: string; // TIMESTAMPTZ
  failed_rounds: FailedRound[]; // Joined data, non-optional
  total_returns: number;
  segregated_parcels: SegregatedParcel[]; // Joined data, non-optional
  attachments?: DUCReportAttachment[]; // Joined data
  notes?: string | null;
  missing_parcels_summary: { // This will be JSONB in DB
    total_missing: number;
    unrecovered: number;
    recovery_rate: number; // Percentage
    parcels: MissingParcelDUCReportContext[]; 
  };
  is_approved?: boolean;
  approved_by_team_member_id?: string | null; // FK
  approved_at?: string | null; // TIMESTAMPTZ
  createdAt?: string; 
  updatedAt?: string; 
  // For UI:
  submitted_by_name?: string;
  sub_depot_name?: string;
  delivery_unit_name?: string;
}

export interface TimeslotTemplate {
  id: string; // UUID PK
  name: string;
  sub_depot_id: number | null; // FK, Can be null for global templates
  slots: string[]; // Array of HH:MM strings (TEXT[] in DB)
  max_capacity_per_slot: number;
  is_default: boolean;
  days_of_week?: number[] | null; // 0 (Sun) - 6 (Sat) for applicability
  createdAt?: string; 
  updatedAt?: string; 
}

export interface TimeslotAssignment {
  id: string; // UUID PK
  round_id: string; // FK
  sub_depot_id: number; // FK
  date: string; // DATE
  timeslot: string; // HH:MM
  assigned_by_team_member_id?: string | null; // FK
  notes?: string | null;
  createdAt?: string; 
  updatedAt?: string; 
}

export type ReportTypeForEmail =
  | 'duc_final_report'
  | 'cage_return_report'
  | 'lost_prevention_report'
  | 'daily_missort_summary'
  | 'weekly_missing_summary'
  | 'worst_courier_performance_report'
  | 'worst_round_performance_report'
  | 'client_missing_league_report'
  | 'top_misrouted_destinations_report'
  | 'worst_courier_carry_forward_report';

export interface EmailTrigger {
  id: string; // UUID PK
  name: string;
  report_type: ReportTypeForEmail;
  frequency: 'daily' | 'weekly' | 'monthly' | 'adhoc';
  day_of_week?: number | null; // 0 (Sun) - 6 (Sat), if weekly
  day_of_month?: string | number | null; // 1-31 or 'last', if monthly
  send_time: string; // TIME
  recipients: string[]; // TEXT[] in DB
  sub_depot_id_filter?: number | 'all' | null; // FK or text 'all'
  is_enabled: boolean;
  last_sent_at?: string | null; // TIMESTAMPTZ
  last_run_status?: 'success' | 'failed' | 'pending' | null;
  last_error_message?: string | null;
  created_by_team_member_id?: string | null; // FK
  createdAt?: string; 
  updatedAt?: string; 
}

export interface AvailabilityRecord {
  id: string; // PK (composite: team_member_id, date)
  team_member_id: string; // FK
  date: string; // DATE
  status: 'Available' | 'Unavailable' | 'BookedHoliday' | 'SickLeave' | 'Training';
  notes?: string | null;
  start_time?: string | null; // TIME, for partial availability
  end_time?: string | null; // TIME, for partial availability
  createdAt?: string; 
  updatedAt?: string; 
}

export interface MissortedParcelDetail {
  id: number; // SERIAL PK
  cage_audit_id: string; // FK
  barcode: string;
  client_id: number; // FK
  reason?: string | null;
  // For UI:
  client_name?: string;
}

export interface CageAuditImage {
  id: number; // SERIAL PK
  cage_audit_id: string; // FK
  image_url: string; // File path
  description?: string | null;
  uploaded_at?: string; // TIMESTAMPTZ
}

export interface CageAuditEntry {
  id: string; // UUID PK
  date: string; // DATE
  team_member_id: string; // FK (auditor)
  sub_depot_id: number; // FK
  round_id: string; // FK
  drop_number: number; // From round for context
  total_parcels_in_cage: number;
  total_missorts_found: number; // Calculated or direct input
  notes?: string | null;
  createdAt?: string; // TIMESTAMPTZ
  updatedAt?: string; 
  // Joined Data for UI/Response (not direct columns in cage_audits table)
  missorted_parcels: MissortedParcelDetail[]; // non-optional
  images: CageAuditImage[]; // non-optional
  // For form data from client before processing into separate tables
  missortImageUrls?: string[]; // Client-side URLs to be processed
}

export interface NonReturnedCageDetail {
  id: number; // SERIAL PK
  cage_return_report_id: string; // FK
  round_id: string; // FK
  courier_id: string; // FK
  reason?: string | null;
  reported_at?: string | null; // TIMESTAMPTZ
  // For UI
  courier_name?: string; 
  round_drop?: number;
}

export interface CageReturnReport {
  id: string; // UUID PK
  date: string; // DATE
  sub_depot_id: number; // FK
  submitted_by_team_member_id: string; // FK
  submitted_at: string; // TIMESTAMPTZ
  notes?: string | null;
  // Joined Data for UI/Response
  non_returned_cages: NonReturnedCageDetail[]; // non-optional
  createdAt?: string; 
  updatedAt?: string; 
  // For UI
  submitted_by_name?: string;
  sub_depot_name?: string;
}

export interface LostPreventionReportAttachment {
    id: number; // SERIAL PK
    lost_prevention_report_id: string; // FK
    file_name: string;
    file_path: string;
    public_url: string;
    description?: string; // e.g., 'CCTV footage', 'Van search photo'
    uploaded_at?: string; // TIMESTAMPTZ
}
export interface LostPreventionReportRound { // Junction table representation if needed
  lost_prevention_report_id: string; // FK
  round_id: string; // FK
}
export interface LostPreventionReport {
  id: string; // UUID PK
  date_of_incident: string; // DATE
  submitted_by_team_member_id: string; // FK
  submitted_at: string; // TIMESTAMPTZ
  courier_id: string; // FK
  incident_description: string;
  cctv_viewed: boolean;
  cctv_details?: string | null;
  van_search_conducted: boolean;
  van_search_findings?: string | null;
  action_taken?: string | null;
  police_report_number?: string | null;
  status: 'Open' | 'UnderInvestigation' | 'Resolved' | 'Closed';
  comments?: string | null;
  // Joined Data for UI/Response
  round_ids: string[]; // Store as TEXT[] in DB or use junction table, non-optional
  attachments?: LostPreventionReportAttachment[];
  createdAt?: string; 
  updatedAt?: string; 
  // For UI
  submitted_by_name?: string;
  courier_name?: string;
  // For form usage only, not directly in DB model
  cctvFileUrl?: string | null; 
  cctvFileName?: string | null;
  vanSearchFileUrl?: string | null; 
  vanSearchFileName?: string | null;
}

export interface DailyMissortSummaryReport {
  id: string; // UUID PK
  date: string; // DATE
  sub_depot_id?: number | null; // FK, null for DU-wide
  total_missorts: number;
  missorts_by_client: Array<{ client_id: number; client_name?: string; count: number }>; // JSONB in DB
  missorts_by_round: Array<{ round_id: string; sub_depot_id: number; sub_depot_name?: string; count: number }>; // JSONB in DB
  notes?: string | null;
  submitted_by_team_member_id: string; // FK
  submitted_at: string; // TIMESTAMPTZ
  createdAt?: string; 
  updatedAt?: string; 
  // For UI
  submitted_by_name?: string;
  sub_depot_name_filter?: string;
}

export interface WeeklyMissingSummaryParcelDetail { // For JSONB field
  parcel_scan_entry_id: string; // FK to parcel_scan_entries
  barcode: string;
  sorter_id: string;
  sorter_name?: string;
  client_id: number; 
  client_name?: string;
  round_id: string;
  sub_depot_id: number;
  sub_depot_name?: string;
  date_added: string; // DATE of the original scan
}

export interface WeeklyMissingSummaryReport {
  id: string; // UUID PK
  week_start_date: string; // DATE (Monday)
  week_end_date: string; // DATE (Sunday)
  total_missing: number;
  missing_by_client: Array<{ client_id: number; client_name?: string; count: number }>; // JSONB
  parcels_summary: WeeklyMissingSummaryParcelDetail[]; // JSONB, renamed from parcels
  generated_by_team_member_id?: string | null; // FK or 'System'
  generated_at: string; // TIMESTAMPTZ
  notes?: string | null;
  createdAt?: string; 
  updatedAt?: string; 
  // For UI
  generated_by_name?: string;
}

// Aftership Tracking Type
export interface AftershipCheckpoint {
  slug?: string | null;
  city?: string | null;
  created_at?: string | null;
  location?: string | null;
  country_name?: string | null;
  message: string;
  state?: string | null;
  tag: string; // e.g., "InfoReceived", "InTransit", "OutForDelivery", "Delivered"
  zip?: string | null;
  checkpoint_time: string; // e.g., "2023-08-15T10:30:00+01:00"
  coordinates?: [number, number] | null;
  country_iso3?: string | null;
  events?: any[]; // Can be more specific if needed
  raw_tag?: string | null; 
}

export interface AftershipTracking {
  id: string;
  tracking_number: string;
  slug: string; // Carrier slug, e.g., "evri"
  tag: string; // Overall status tag
  subtag: string;
  subtag_message: string; // Human-readable status detail
  checkpoints?: AftershipCheckpoint[];
  // Add other fields as needed from Aftership API response
  // e.g., expected_delivery, shipment_pickup_date, etc.
  title?: string | null; // Parcel title / description
  order_id?: string | null;
  customer_name?: string | null;
  emails?: string[] | null;
  smses?: string[] | null;
  origin_country_iso3?: string | null;
  destination_country_iso3?: string | null;
}


// --- Unchanged types from original (Review if they need DB alignment) ---
// These often represent derived data for UI display or specific client-side features.

export type DashboardMetric = { 
  id: string; title: string; value: number | string; change?: number; 
  changeType?: 'increase' | 'decrease'; icon: LucideIcon; color: string; 
  trend?: number[]; target?: number; unit?: string; visualType?: 'line-sparkline' | 'gauge'; 
}
export interface AlertConfig { id: string; title: string; description: string; severity: 'low' | 'medium' | 'high'; isActive: boolean; conditions: { type: string; metric?: string; operator?: string; value: any }[]; recipients: string[]; }

// ScanActivity and ForecastActivity are likely derived summaries for dashboard.
// Their structure depends on how you want to display them, not necessarily direct DB tables.
export interface ScanActivity { 
  date: string; // Likely YYYY-MM-DD for grouping
  userId?: string; // Team member ID
  userType?: string; // Role
  userName?: string; // Team member name
  subDepot?: number; // Sub-depot ID
  subDepotName?: string; // Sub-depot name
  totalScanned: number; 
  timeCompleted?: string; // e.g. last scan time
  missorts: number; // Made non-optional as it's used in calculations
}
export interface ForecastActivity { 
  date: string; // YYYY-MM-DD
  subDepot?: number; 
  subDepotName?: string;
  forecast: number; 
  actual: number; // Actual scanned volume for comparison
}

// This was specifically for API response, might not be needed if API returns DepotOpenRecord directly
export interface DepotOpenApiResponseItem { 
  id: string; date: string; time: string; sub_depot_id: number | null; notes?: string; 
}

export type PeriodSelection = 'day' | 'week' | 'month' | 'custom'; // Added custom

// Performance/League Reports - these are typically generated, not stored as fixed tables.
// Their structure is for the report output.
export interface WorstCourierPerformanceReport { id: string; periodType: PeriodSelection; startDate: string; endDate: string; couriers: Array<{ courierId: string; courierName?: string; score: number; metrics: { totalMissing: number; unrecovered: number; carryForwards: number; }; reasons?: string[]; }>; generatedAt: string; generatedBy: string; }
export interface WorstRoundPerformanceReport { id: string; periodType: PeriodSelection; startDate: string; endDate: string; rounds: Array<{ roundId: string; subDepotId: number; subDepotName?: string; score: number; metrics: { totalMissing: number; }; reasons?: string[]; }>; generatedAt: string; generatedBy: string; }
export interface ClientMissingLeagueReport { id: string; periodType: PeriodSelection; startDate: string; endDate: string; clients: Array<{ clientId: number; clientName?: string; totalMissing: number; rank: number; }>; generatedAt: string; generatedBy: string; }
export interface TopMisroutedDestinationsReport { id: string; periodType: PeriodSelection; startDate: string; endDate: string; destinations: Array<{ destinationDUId: string; destinationDUName?: string; count: number; }>; generatedAt: string; generatedBy: string; }
export interface WorstCourierCarryForwardReport { id: string; periodType: PeriodSelection; startDate: string; endDate: string; couriers: Array<{ courierId: string; courierName?: string; totalCarryForwards: number; }>; generatedAt: string; generatedBy: string; }


export type DailyOpsView = 'menu' | 'missingParcels' | 'depotOpen' | 'waves' | 'scanLogs' | 'forecasts' | 'workSchedules' | 'invoices' | 'availability' | 'cageAudit';
export type SetupView = 'menu' | 'team' | 'rounds' | 'couriers' | 'clients' | 'deliveryunits' | 'subdepots' | 'vehicles' | 'hhtassets' | 'hhtlogins' | 'payperiods' | 'timeslots' | 'cagelabels' | 'emailTriggers';
export type SearchMode = 'courier' | 'round' | 'drop' | 'barcode' | 'none'; // Added barcode
export type ReportView = | 'menu' | 'ducFinalReport' | 'cageReturnReport' | 'lostPrevention' | 'dailyMissortSummary' | 'weeklyMissingSummary' | 'worstCourierPerformance' | 'worstRoundPerformance' | 'clientMissingLeague' | 'topMisroutedDestinations' | 'worstCourierCarryForward';
export type NavItemType = { path: string; name: string; icon: LucideIcon; color: string; subView?: DailyOpsView | SetupView | ReportView; };

export type SearchResultItem = 
  | { type: 'courier'; data: Courier } 
  | { type: 'round'; data: Round & {subDepotName?: string} } 
  | { type: 'drop'; data: { dropNumber: number, rounds: (Round & {subDepotName?: string})[], roundCount: number } }
  | { type: 'parcel_scan'; data: ParcelScanEntry }; // Added parcel scan result


export interface CourierProfileData extends Courier { stats: { totalMissing: number; unrecovered: number; recovered: number; recoveryRate: number; totalCarryForwards: number; }; parcels: ParcelScanEntry[]; parcelsByDate: Record<string, ParcelScanEntry[]>; roundsInvolved: string[]; subDepotsInvolved: number[]; flags: string[]; recentActivityCount: number; todaysTimeslots: { roundId: string; timeslot: string | null }[]; }
export interface RoundProfileData extends Round { subDepotName: string; stats: { totalMissing: number; unrecovered: number; recovered: number; recoveryRate: number; }; parcels: ParcelScanEntry[]; parcelsByDate: Record<string, ParcelScanEntry[]>; couriersInvolved: { id?: string; name: string; parcelsCount: number; unrecoveredCount: number }[]; sortersInvolved: { id?: string; name: string; parcelsCount: number; unrecoveredCount: number }[]; flags: string[]; todaysTimeslot: string | null; }
export interface DropProfileData { dropNumber: number; roundsInvolvedDetails: Array<{ roundData: Round; subDepotName: string; parcels: ParcelScanEntry[]; unrecoveredCount: number; totalMissingCount: number; }>; stats: { totalRoundsWithThisDrop: number; affectedRoundsCount: number; totalMissing: number; totalUnrecovered: number; recoveryRate: number; }; flags: string[]; }
export interface ParcelScanProfileData extends ParcelScanEntry {
    // Add any specific profile view enrichments if needed
    courier?: Courier | null;
    sorter?: TeamMember | null;
    client?: Client | null;
    roundInfo?: Round | null;
    subDepotInfo?: SubDepot | null;
    misroutedDUInfo?: DeliveryUnit | null;
}


export interface DatabaseStatusCounts { [key: string]: { count: number }; }
export interface CageLabelData { dropNumber: number; roundId: string; subDepotName: string; }

// Standard API Response Wrapper
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  total?: number; // For paginated lists
  status: number; // HTTP status code for client-side interpretation if needed
  details?: any; // For more detailed error info
}