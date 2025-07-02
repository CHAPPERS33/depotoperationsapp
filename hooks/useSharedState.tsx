
// hooks/useSharedState.ts
import React, { useState, useEffect, createContext, useContext, ReactNode, Dispatch, SetStateAction, useRef, useCallback } from 'react';
import { 
    DeliveryUnit, SubDepot, TeamMember, Round, Courier, Client, Vehicle, 
    DepotOpenRecord, WaveEntry, HHTAsset, HHTLogin, ScanLog, ParcelScanEntry, RoundEntry,
    PayPeriod, Forecast, WorkSchedule, Invoice, DUCFinalReport, 
    TimeslotTemplate, TimeslotAssignment, EmailTrigger, AlertConfig, 
    ScanActivity, ForecastActivity, AvailabilityRecord, 
    CageAuditEntry, CageReturnReport, LostPreventionReport, DailyMissortSummaryReport, 
    WeeklyMissingSummaryReport, WorstCourierPerformanceReport, 
    WorstRoundPerformanceReport, ClientMissingLeagueReport, 
    TopMisroutedDestinationsReport, WorstCourierCarryForwardReport,
    ApiResponse
} from '../types';
import * as apiService from '../services/apiService';
import { TODAY_DATE_STRING, TODAY_DATE_STRING_GB } from '../constants';
import { 
    INITIAL_ALERT_CONFIGS_DATA, INITIAL_SCAN_ACTIVITY_DATA, INITIAL_FORECAST_ACTIVITY_DATA, 
    INITIAL_TEAM_MEMBERS_DATA, INITIAL_PAY_PERIODS_DATA, INITIAL_FORECASTS_DATA, 
    INITIAL_WORK_SCHEDULES_DATA, INITIAL_INVOICES_DATA, INITIAL_MISSING_PARCELS_LOG_DATA,
    INITIAL_DEPOT_OPEN_RECORDS_DATA, INITIAL_DELIVERY_UNITS_DATA, INITIAL_SUBDEPOTS_DATA,
    INITIAL_ROUNDS_DATA, INITIAL_COURIERS_DATA, INITIAL_CLIENTS_DATA, INITIAL_VEHICLES_DATA,
    INITIAL_WAVES_DATA, INITIAL_HHT_ASSETS_DATA, INITIAL_HHT_LOGINS_DATA, INITIAL_SCAN_LOGS_DATA,
    INITIAL_DUC_FINAL_REPORTS_DATA, INITIAL_TIMESLOT_TEMPLATES_DATA, INITIAL_TIMESLOT_ASSIGNMENTS_DATA,
    INITIAL_EMAIL_TRIGGERS_DATA, INITIAL_AVAILABILITY_RECORDS_DATA, INITIAL_CAGE_AUDITS_DATA,
    INITIAL_CAGE_RETURN_REPORTS_DATA, INITIAL_LOST_PREVENTION_REPORTS_DATA,
    INITIAL_DAILY_MISSORT_SUMMARY_REPORTS_DATA, INITIAL_WEEKLY_MISSING_SUMMARY_REPORTS_DATA,
    INITIAL_WORST_COURIER_PERFORMANCE_REPORTS_DATA, INITIAL_WORST_ROUND_PERFORMANCE_REPORTS_DATA,
    INITIAL_CLIENT_MISSING_LEAGUE_REPORTS_DATA, INITIAL_TOP_MISROUTED_DESTINATIONS_REPORTS_DATA,
    INITIAL_WORST_COURIER_CARRY_FORWARD_REPORTS_DATA
} from '../constants';


export interface DatabaseStatusCounts { [key: string]: { count: number }; }
export interface SharedState {
  deliveryUnits: DeliveryUnit[]; setDeliveryUnits: Dispatch<SetStateAction<DeliveryUnit[]>>;
  fetchDeliveryUnits: () => Promise<void>; addDeliveryUnit: (data: Omit<DeliveryUnit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DeliveryUnit | null>; 
  updateDeliveryUnit: (id: string, data: Partial<DeliveryUnit>) => Promise<DeliveryUnit | null>; deleteDeliveryUnit: (id: string) => Promise<boolean>;

  subDepots: SubDepot[]; setSubDepots: Dispatch<SetStateAction<SubDepot[]>>;
  fetchSubDepots: () => Promise<void>; addSubDepot: (data: Omit<SubDepot, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SubDepot | null>; 
  updateSubDepot: (id: number, data: Partial<SubDepot>) => Promise<SubDepot | null>; deleteSubDepot: (id: number) => Promise<boolean>;

  team: TeamMember[]; setTeam: Dispatch<SetStateAction<TeamMember[]>>;
  fetchTeam: () => Promise<void>; saveTeamMember: (member: Partial<TeamMember>, isNew: boolean) => Promise<TeamMember | null>;
  deleteTeamMember: (memberId: string) => Promise<boolean>;
  isLoadingTeam: boolean;

  rounds: Round[]; setRounds: Dispatch<SetStateAction<Round[]>>;
  fetchRounds: () => Promise<void>; addRound: (data: Omit<Round, 'createdAt' | 'updatedAt'>) => Promise<Round | null>;  
  updateRound: (id: string, data: Partial<Round>) => Promise<Round | null>; deleteRound: (id: string) => Promise<boolean>;

  couriers: Courier[]; setCouriers: Dispatch<SetStateAction<Courier[]>>;
  fetchCouriers: () => Promise<void>; addCourier: (data: Omit<Courier, 'createdAt' | 'updatedAt'>) => Promise<Courier | null>; 
  updateCourier: (id: string, data: Partial<Courier>) => Promise<Courier | null>; deleteCourier: (id: string) => Promise<boolean>;

  clients: Client[]; setClients: Dispatch<SetStateAction<Client[]>>;
  fetchClients: () => Promise<void>; addClient: (data: Omit<Client, 'id'| 'createdAt' | 'updatedAt'>) => Promise<Client | null>;
  updateClient: (id: number, data: Partial<Client>) => Promise<Client | null>; deleteClient: (id: number) => Promise<boolean>;
  
  vehicles: Vehicle[]; setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  fetchVehicles: () => Promise<void>; addVehicle: (data: Omit<Vehicle, 'createdAt' | 'updatedAt'>) => Promise<Vehicle | null>; 
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle | null>; deleteVehicle: (id: string) => Promise<boolean>;

  depotOpenRecords: DepotOpenRecord[]; 
  fetchDepotOpenRecords: (date: string) => Promise<void>; 
  saveDepotOpenRecord: (record: Omit<DepotOpenRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DepotOpenRecord | null>;
  isLoadingDepotOpenRecords: boolean;

  waves: WaveEntry[]; setWaves: Dispatch<SetStateAction<WaveEntry[]>>;
  fetchWaves: () => Promise<void>; 
  addWaveEntry: (formData: FormData) => Promise<WaveEntry | null>; 
  deleteWaveEntry: (id: string) => Promise<boolean>;

  hhtAssets: HHTAsset[]; setHhtAssets: Dispatch<SetStateAction<HHTAsset[]>>;
  fetchHhtAssets: () => Promise<void>; addHHTAsset: (data: Omit<HHTAsset, 'createdAt' | 'updatedAt'>) => Promise<HHTAsset | null>;
  updateHHTAsset: (serial_number: string, data: Partial<HHTAsset>) => Promise<HHTAsset | null>; deleteHHTAsset: (serial_number: string) => Promise<boolean>;

  hhtLogins: HHTLogin[]; setHhtLogins: Dispatch<SetStateAction<HHTLogin[]>>;
  fetchHhtLogins: () => Promise<void>; addHHTLogin: (data: Omit<HHTLogin, 'createdAt' | 'updatedAt' | 'pin_hash'> & {pin: string}) => Promise<HHTLogin | null>;
  updateHHTLogin: (login_id: string, data: Partial<Omit<HHTLogin, 'pin_hash'>> & {pin?:string}) => Promise<HHTLogin | null>; deleteHHTLogin: (login_id: string) => Promise<boolean>;

  scanLogs: ScanLog[]; setScanLogs: Dispatch<SetStateAction<ScanLog[]>>;
  fetchScanLogs: () => Promise<void>; 
  addScanLog: (formData: FormData) => Promise<ScanLog | null>; 
  deleteScanLog: (id: string) => Promise<boolean>;

  missingParcelsLog: RoundEntry[]; setMissingParcelsLog: Dispatch<SetStateAction<RoundEntry[]>>;
  fetchMissingParcelsLog: () => Promise<void>;
  isLoadingMissingParcelsLog: boolean;
  addMissingParcelsToLog: (parcelsData: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>[]) => Promise<ParcelScanEntry[] | null>;
  updateParcelInLog: (parcelId: string, updates: Partial<ParcelScanEntry>) => Promise<ParcelScanEntry | null>;
  deleteParcelFromLog: (parcelId: string) => Promise<boolean>;
  markMissingParcelRecovered: (parcelId: string, recovered: boolean) => Promise<ParcelScanEntry | null>;

  payPeriods: PayPeriod[]; setPayPeriods: Dispatch<SetStateAction<PayPeriod[]>>;
  fetchPayPeriods: () => Promise<void>; 
  savePayPeriod: (periodData: Partial<PayPeriod>, isNew: boolean) => Promise<PayPeriod | null>;
  deletePayPeriod: (id: string) => Promise<boolean>;
  isLoadingPayPeriods: boolean;
  
  forecasts: Forecast[]; setForecasts: Dispatch<SetStateAction<Forecast[]>>;
  fetchForecasts: () => Promise<void>; saveForecast: (forecast: Partial<Forecast>, isNew: boolean) => Promise<Forecast | null>;
  deleteForecast: (id: string) => Promise<boolean>;
  isLoadingForecasts: boolean;

  workSchedules: WorkSchedule[]; setWorkSchedules: Dispatch<SetStateAction<WorkSchedule[]>>;
  fetchWorkSchedules: (date?: string) => Promise<void>; saveWorkSchedule: (schedule: Partial<WorkSchedule>, isNew: boolean) => Promise<WorkSchedule | null>;
  deleteWorkSchedule: (id: string) => Promise<boolean>;
  isLoadingWorkSchedules: boolean;

  invoices: Invoice[]; setInvoices: Dispatch<SetStateAction<Invoice[]>>;
  fetchInvoices: (filters?: {payPeriodId?: string, teamMemberId?: string, status?: string}) => Promise<void>;
  saveInvoice: (formData: FormData, isNew: boolean, invoiceId?: string) => Promise<Invoice | null>; 
  deleteInvoice: (id: string) => Promise<boolean>;
  isLoadingInvoices: boolean;

  ducFinalReports: DUCFinalReport[]; setDucFinalReports: Dispatch<SetStateAction<DUCFinalReport[]>>;
  fetchDucFinalReports: () => Promise<void>; addDUCFinalReport: (formData: FormData) => Promise<DUCFinalReport | null>;

  cageAudits: CageAuditEntry[]; setCageAudits: Dispatch<SetStateAction<CageAuditEntry[]>>;
  fetchCageAudits: () => Promise<void>; addCageAudit: (formData: FormData) => Promise<CageAuditEntry | null>;

  cageReturnReports: CageReturnReport[]; setCageReturnReports: Dispatch<SetStateAction<CageReturnReport[]>>;
  fetchCageReturnReports: () => Promise<void>; addOrUpdateCageReturnReport: (report: Partial<CageReturnReport>, isNew: boolean) => Promise<CageReturnReport | null>;

  lostPreventionReports: LostPreventionReport[]; setLostPreventionReports: Dispatch<SetStateAction<LostPreventionReport[]>>;
  fetchLostPreventionReports: () => Promise<void>; 
  saveLostPreventionReport: (formData: FormData, isNew: boolean, reportId?:string) => Promise<LostPreventionReport | null>; 
  deleteLostPreventionReport: (id: string) => Promise<boolean>;
  
  dailyMissortSummaryReports: DailyMissortSummaryReport[]; setDailyMissortSummaryReports: Dispatch<SetStateAction<DailyMissortSummaryReport[]>>;
  fetchDailyMissortSummaryReports: () => Promise<void>; addDailyMissortSummaryReport: (report: Omit<DailyMissortSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt'>) => Promise<DailyMissortSummaryReport | null>;
  
  weeklyMissingSummaryReports: WeeklyMissingSummaryReport[]; setWeeklyMissingSummaryReports: Dispatch<SetStateAction<WeeklyMissingSummaryReport[]>>;
  fetchWeeklyMissingSummaryReports: () => Promise<void>; addWeeklyMissingSummaryReport: (report: Omit<WeeklyMissingSummaryReport, 'id' | 'generated_at' | 'createdAt' | 'updatedAt'>) => Promise<WeeklyMissingSummaryReport | null>;
  
  worstCourierPerformanceReports: WorstCourierPerformanceReport[]; setWorstCourierPerformanceReports: Dispatch<SetStateAction<WorstCourierPerformanceReport[]>>;
  addWorstCourierPerformanceReport: (report: Omit<WorstCourierPerformanceReport, 'id' | 'generatedAt' | 'generatedBy'>) => Promise<WorstCourierPerformanceReport | null>;
  fetchWorstCourierPerformanceReports: () => Promise<void>;

  worstRoundPerformanceReports: WorstRoundPerformanceReport[]; setWorstRoundPerformanceReports: Dispatch<SetStateAction<WorstRoundPerformanceReport[]>>;
  addWorstRoundPerformanceReport: (report: Omit<WorstRoundPerformanceReport, 'id' | 'generatedAt' | 'generatedBy'>) => Promise<WorstRoundPerformanceReport | null>;
  fetchWorstRoundPerformanceReports: () => Promise<void>;

  clientMissingLeagueReports: ClientMissingLeagueReport[]; setClientMissingLeagueReports: Dispatch<SetStateAction<ClientMissingLeagueReport[]>>;
  addClientMissingLeagueReport: (report: Omit<ClientMissingLeagueReport, 'id' | 'generatedAt' | 'generatedBy'>) => Promise<ClientMissingLeagueReport | null>;
  fetchClientMissingLeagueReports: () => Promise<void>;

  topMisroutedDestinationsReports: TopMisroutedDestinationsReport[]; setTopMisroutedDestinationsReports: Dispatch<SetStateAction<TopMisroutedDestinationsReport[]>>;
  addTopMisroutedDestinationsReport: (report: Omit<TopMisroutedDestinationsReport, 'id' | 'generatedAt' | 'generatedBy'>) => Promise<TopMisroutedDestinationsReport | null>;
  fetchTopMisroutedDestinationsReports: () => Promise<void>;

  worstCourierCarryForwardReports: WorstCourierCarryForwardReport[]; setWorstCourierCarryForwardReports: Dispatch<SetStateAction<WorstCourierCarryForwardReport[]>>;
  addWorstCourierCarryForwardReport: (report: Omit<WorstCourierCarryForwardReport, 'id' | 'generatedAt' | 'generatedBy'>) => Promise<WorstCourierCarryForwardReport | null>;
  fetchWorstCourierCarryForwardReports: () => Promise<void>;

  timeslotTemplates: TimeslotTemplate[]; setTimeslotTemplates: Dispatch<SetStateAction<TimeslotTemplate[]>>;
  fetchTimeslotTemplates: () => Promise<void>; addTimeslotTemplate: (data: Omit<TimeslotTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TimeslotTemplate | null>;
  updateTimeslotTemplate: (id: string, data: Partial<TimeslotTemplate>) => Promise<TimeslotTemplate | null>; deleteTimeslotTemplate: (id: string) => Promise<boolean>;

  timeslotAssignments: TimeslotAssignment[]; setTimeslotAssignments: Dispatch<SetStateAction<TimeslotAssignment[]>>;
  fetchTimeslotAssignments: (date?: string) => Promise<void>; 
  saveTimeslotAssignment: (data: Omit<TimeslotAssignment, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<TimeslotAssignment | null>;
  deleteTimeslotAssignment: (id: string) => Promise<boolean>;

  emailTriggers: EmailTrigger[]; setEmailTriggers: Dispatch<SetStateAction<EmailTrigger[]>>;
  fetchEmailTriggers: () => Promise<void>; addEmailTrigger: (data: Omit<EmailTrigger, 'id' | 'createdAt' | 'updatedAt' | 'last_sent_at' | 'last_run_status' | 'last_error_message'>) => Promise<EmailTrigger | null>;
  updateEmailTrigger: (id: string, data: Partial<EmailTrigger>) => Promise<EmailTrigger | null>; deleteEmailTrigger: (id: string) => Promise<boolean>;

  availabilityRecords: AvailabilityRecord[]; setAvailabilityRecords: Dispatch<SetStateAction<AvailabilityRecord[]>>;
  fetchAvailabilityRecords: (teamMemberId?: string, startDate?: string, endDate?: string) => Promise<void>;
  addOrUpdateAvailabilityRecord: (record: Omit<AvailabilityRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AvailabilityRecord | null>;
  removeAvailabilityRecord: (teamMemberId: string, date: string) => Promise<boolean>;
  getAvailabilityForMemberDate: (teamMemberId: string, date: string) => AvailabilityRecord | undefined;

  alertConfigs: AlertConfig[]; setAlertConfigs: Dispatch<SetStateAction<AlertConfig[]>>;
  scanActivityData: ScanActivity[]; setScanActivityData: Dispatch<SetStateAction<ScanActivity[]>>;
  forecastActivityData: ForecastActivity[]; setForecastActivityData: Dispatch<SetStateAction<ForecastActivity[]>>;
  
  isLoading: boolean; 
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  
  fetchScanData: () => Promise<void>;
  fetchForecastActivityData: () => Promise<void>;
  refreshScanData: () => Promise<void>; 
  refreshForecastActivityData: () => Promise<void>;

  currentCourierForWorkflow: string; setCurrentCourierForWorkflow: Dispatch<SetStateAction<string>>;
  activeTab: string; setActiveTab: Dispatch<SetStateAction<string>>;
  dailyOpsView: string; setDailyOpsView: Dispatch<SetStateAction<string>>;

  isSeeding: boolean; seedMessage: string | null; isCheckingStatus: boolean;
  databaseStatus: DatabaseStatusCounts | null; statusError: string | null;
  handleSeedDatabase: () => Promise<void>; handleCheckDatabaseStatus: () => Promise<void>;
  clearSeedMessage: () => void;
  
  headerSearchInputRef: React.RefObject<HTMLInputElement> | null;
  focusHeaderSearchInput: () => void;
}

const SharedStateContext = createContext<SharedState | undefined>(undefined);

export const SharedStateProvider = ({ children }: {children: ReactNode}): React.ReactElement => {
  const [deliveryUnits, setDeliveryUnits] = useState<DeliveryUnit[]>(INITIAL_DELIVERY_UNITS_DATA);
  const [subDepots, setSubDepots] = useState<SubDepot[]>(INITIAL_SUBDEPOTS_DATA);
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS_DATA);
  const [rounds, setRounds] = useState<Round[]>(INITIAL_ROUNDS_DATA);
  const [couriers, setCouriers] = useState<Courier[]>(INITIAL_COURIERS_DATA);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS_DATA);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES_DATA);
  const [depotOpenRecords, setDepotOpenRecords] = useState<DepotOpenRecord[]>(INITIAL_DEPOT_OPEN_RECORDS_DATA);
  const [waves, setWaves] = useState<WaveEntry[]>(INITIAL_WAVES_DATA);
  const [hhtAssets, setHhtAssets] = useState<HHTAsset[]>(INITIAL_HHT_ASSETS_DATA);
  const [hhtLogins, setHhtLogins] = useState<HHTLogin[]>(INITIAL_HHT_LOGINS_DATA);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>(INITIAL_SCAN_LOGS_DATA);
  const [missingParcelsLog, setMissingParcelsLog] = useState<RoundEntry[]>(INITIAL_MISSING_PARCELS_LOG_DATA);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>(INITIAL_PAY_PERIODS_DATA);
  const [forecasts, setForecasts] = useState<Forecast[]>(INITIAL_FORECASTS_DATA);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>(INITIAL_WORK_SCHEDULES_DATA);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES_DATA);
  const [ducFinalReports, setDucFinalReports] = useState<DUCFinalReport[]>(INITIAL_DUC_FINAL_REPORTS_DATA);
  const [timeslotTemplates, setTimeslotTemplates] = useState<TimeslotTemplate[]>(INITIAL_TIMESLOT_TEMPLATES_DATA);
  const [timeslotAssignments, setTimeslotAssignments] = useState<TimeslotAssignment[]>(INITIAL_TIMESLOT_ASSIGNMENTS_DATA);
  const [emailTriggers, setEmailTriggers] = useState<EmailTrigger[]>(INITIAL_EMAIL_TRIGGERS_DATA);
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>(INITIAL_AVAILABILITY_RECORDS_DATA);
  const [cageAudits, setCageAudits] = useState<CageAuditEntry[]>(INITIAL_CAGE_AUDITS_DATA);
  const [cageReturnReports, setCageReturnReports] = useState<CageReturnReport[]>(INITIAL_CAGE_RETURN_REPORTS_DATA);
  const [lostPreventionReports, setLostPreventionReports] = useState<LostPreventionReport[]>(INITIAL_LOST_PREVENTION_REPORTS_DATA);
  const [dailyMissortSummaryReports, setDailyMissortSummaryReports] = useState<DailyMissortSummaryReport[]>(INITIAL_DAILY_MISSORT_SUMMARY_REPORTS_DATA);
  const [weeklyMissingSummaryReports, setWeeklyMissingSummaryReports] = useState<WeeklyMissingSummaryReport[]>(INITIAL_WEEKLY_MISSING_SUMMARY_REPORTS_DATA);
  const [worstCourierPerformanceReports, setWorstCourierPerformanceReports] = useState<WorstCourierPerformanceReport[]>(INITIAL_WORST_COURIER_PERFORMANCE_REPORTS_DATA);
  const [worstRoundPerformanceReports, setWorstRoundPerformanceReports] = useState<WorstRoundPerformanceReport[]>(INITIAL_WORST_ROUND_PERFORMANCE_REPORTS_DATA);
  const [clientMissingLeagueReports, setClientMissingLeagueReports] = useState<ClientMissingLeagueReport[]>(INITIAL_CLIENT_MISSING_LEAGUE_REPORTS_DATA);
  const [topMisroutedDestinationsReports, setTopMisroutedDestinationsReports] = useState<TopMisroutedDestinationsReport[]>(INITIAL_TOP_MISROUTED_DESTINATIONS_REPORTS_DATA);
  const [worstCourierCarryForwardReports, setWorstCourierCarryForwardReports] = useState<WorstCourierCarryForwardReport[]>(INITIAL_WORST_COURIER_CARRY_FORWARD_REPORTS_DATA);

  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>(INITIAL_ALERT_CONFIGS_DATA);
  const [scanActivityData, setScanActivityData] = useState<ScanActivity[]>(INITIAL_SCAN_ACTIVITY_DATA); 
  const [forecastActivityData, setForecastActivityData] = useState<ForecastActivity[]>(INITIAL_FORECAST_ACTIVITY_DATA);
  
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isLoadingPayPeriods, setIsLoadingPayPeriods] = useState(false);
  const [isLoadingDepotOpenRecords, setIsLoadingDepotOpenRecords] = useState(false);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false);
  const [isLoadingWorkSchedules, setIsLoadingWorkSchedules] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingMissingParcelsLog, setIsLoadingMissingParcelsLog] = useState(false);

  const [currentCourierForWorkflow, setCurrentCourierForWorkflow] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dailyOpsView, setDailyOpsView] = useState<string>('menu');

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatusCounts | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const headerSearchInputRef = useRef<HTMLInputElement>(null);

  const focusHeaderSearchInput = useCallback(() => headerSearchInputRef.current?.focus(), []);
  const clearSeedMessage = useCallback(() => { setSeedMessage(null); setStatusError(null); }, []);

  const fetchData = useCallback(
    async <T,>(
      entityName: string, 
      setter: Dispatch<SetStateAction<T[]>>,
      apiFetchFunction: (params?: any) => Promise<ApiResponse<T[]>>, 
      params?: Record<string, string>,
      loadingSetter?: Dispatch<SetStateAction<boolean>>,
      initialDataOnError?: T[]
    ): Promise<void> => {
      const targetLoadingSetter = loadingSetter || setIsLoading;
      targetLoadingSetter(true);
      setError(null);
      try {
        const response = await apiFetchFunction(params);
        setter(response.data || (initialDataOnError !== undefined ? initialDataOnError : []));
      } catch (e: any) {
        setError(`Failed to fetch ${entityName.replace(/-/g, ' ')}: ${e.message}`);
        setter(initialDataOnError !== undefined ? initialDataOnError : []); 
      } finally {
        targetLoadingSetter(false);
      }
    },
    [] 
  );

  const addData = useCallback(
    async <TResponse, TPayload>(
      entityName: string, 
      fetchListFunc: () => Promise<void>, 
      newData: TPayload,
      apiCreateFunction: (data: TPayload) => Promise<ApiResponse<TResponse>>,
      useFormData: boolean = false 
    ): Promise<TResponse | null> => {
      setIsLoading(true); setError(null);
      try {
        const response = useFormData 
          ? await apiService.createEntityWithFiles<TResponse>(entityName, newData as unknown as FormData)
          : await apiCreateFunction(newData);
        await fetchListFunc(); 
        return response.data || null;
      } catch (e: any) {
        setError(`Failed to add ${entityName.replace(/-/g, ' ')}: ${e.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [] 
  );
  
  const updateData = useCallback(
    async <TResponse, TPayload>(
      entityName: string, 
      id: string | number, 
      fetchListFunc: () => Promise<void>, 
      updatedData: TPayload,
      apiUpdateFunction: (id: string | number, data: TPayload) => Promise<ApiResponse<TResponse>>,
      useFormData: boolean = false
    ): Promise<TResponse | null> => {
      setIsLoading(true); setError(null);
      try {
        const response = useFormData
          ? await apiService.updateEntityWithFiles<TResponse>(entityName, id, updatedData as unknown as FormData)
          : await apiUpdateFunction(id, updatedData);
        await fetchListFunc(); 
        return response.data || null;
      } catch (e: any) {
        setError(`Failed to update ${entityName.replace(/-/g, ' ')} (ID: ${id}): ${e.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [] 
  );

  const deleteData = useCallback(
    async (
      entityName: string, 
      id: string | number, 
      fetchListFunc: () => Promise<void>,
      apiDeleteFunction: (id: string | number) => Promise<ApiResponse<any>>
    ): Promise<boolean> => {
      setIsLoading(true); setError(null);
      try {
        await apiDeleteFunction(id);
        await fetchListFunc(); 
        return true;
      } catch (e: any) {
        setError(`Failed to delete ${entityName.replace(/-/g, ' ')} (ID: ${id}): ${e.message}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [] 
  );

  const fetchDeliveryUnits = useCallback(() => fetchData<DeliveryUnit>('delivery-units', setDeliveryUnits, (p) => apiService.fetchEntityList<DeliveryUnit>('delivery-units', p), undefined, undefined, INITIAL_DELIVERY_UNITS_DATA), [fetchData]);
  const addDeliveryUnit = useCallback((data: Omit<DeliveryUnit, 'id'| 'createdAt' | 'updatedAt'>) => addData<DeliveryUnit, typeof data>('delivery-units', fetchDeliveryUnits, data, (d) => apiService.createEntity<DeliveryUnit, typeof data>('delivery-units', d)), [addData, fetchDeliveryUnits]);
  const updateDeliveryUnit = useCallback((id: string, data: Partial<DeliveryUnit>) => updateData<DeliveryUnit, typeof data>('delivery-units', id, fetchDeliveryUnits, data, (i,d) => apiService.updateEntity<DeliveryUnit, typeof data>('delivery-units', i, d)), [updateData, fetchDeliveryUnits]);
  const deleteDeliveryUnit = useCallback((id: string) => deleteData('delivery-units', id, fetchDeliveryUnits, (i) => apiService.deleteEntity('delivery-units', i)), [deleteData, fetchDeliveryUnits]);

  const fetchSubDepots = useCallback(() => fetchData<SubDepot>('sub-depots', setSubDepots, (p) => apiService.fetchEntityList<SubDepot>('sub-depots', p), undefined, undefined, INITIAL_SUBDEPOTS_DATA), [fetchData]);
  const addSubDepot = useCallback((data: Omit<SubDepot, 'id' | 'createdAt' | 'updatedAt'>) => addData<SubDepot, typeof data>('sub-depots', fetchSubDepots, data, (d) => apiService.createEntity<SubDepot, typeof data>('sub-depots', d)), [addData, fetchSubDepots]);
  const updateSubDepot = useCallback((id: number, data: Partial<SubDepot>) => updateData<SubDepot, typeof data>('sub-depots', id, fetchSubDepots, data, (i,d) => apiService.updateEntity<SubDepot, typeof data>('sub-depots', i, d)), [updateData, fetchSubDepots]);
  const deleteSubDepot = useCallback((id: number) => deleteData('sub-depots', id, fetchSubDepots, (i) => apiService.deleteEntity('sub-depots', i)), [deleteData, fetchSubDepots]);

  const fetchTeam = useCallback(() => fetchData<TeamMember>('team', setTeam, apiService.fetchTeamMembers, undefined, setIsLoadingTeam, INITIAL_TEAM_MEMBERS_DATA ), [fetchData, setIsLoadingTeam]);
  const saveTeamMember = useCallback(async (member: Partial<TeamMember>, isNew: boolean): Promise<TeamMember | null> => {
    setIsLoadingTeam(true);
    setError(null);
    try {
      const response = await apiService.saveTeamMember(member, isNew);
      await fetchTeam(); 
      return response.data || null;
    } catch(e: any) {
      setError(`Failed to save team member: ${e.message}`);
      return null;
    } finally {
      setIsLoadingTeam(false);
    }
  }, [fetchTeam, setIsLoadingTeam, setError]);
  const deleteTeamMember = useCallback(async (memberId: string): Promise<boolean> => {
    setIsLoadingTeam(true);
    setError(null);
    try {
      await apiService.deleteTeamMember(memberId);
      await fetchTeam(); 
      return true;
    } catch(e: any) {
      setError(`Failed to delete team member: ${e.message}`);
      return false;
    } finally {
      setIsLoadingTeam(false);
    }
  }, [fetchTeam, setIsLoadingTeam, setError]);

  const fetchRounds = useCallback(() => fetchData<Round>('rounds', setRounds, (p) => apiService.fetchEntityList<Round>('rounds', p), undefined, undefined, INITIAL_ROUNDS_DATA), [fetchData]);
  const addRound = useCallback((data: Omit<Round, 'createdAt' | 'updatedAt'>) => addData<Round, typeof data>('rounds', fetchRounds, data, (d) => apiService.createEntity<Round, typeof data>('rounds', d)), [addData, fetchRounds]);
  const updateRound = useCallback((id: string, data: Partial<Round>) => updateData<Round, typeof data>('rounds', id, fetchRounds, data, (i,d) => apiService.updateEntity<Round, typeof data>('rounds', i, d)), [updateData, fetchRounds]);
  const deleteRound = useCallback((id: string) => deleteData('rounds', id, fetchRounds, (i) => apiService.deleteEntity('rounds', i)), [deleteData, fetchRounds]);

  const fetchCouriers = useCallback(() => fetchData<Courier>('couriers', setCouriers, (p) => apiService.fetchEntityList<Courier>('couriers', p), undefined, undefined, INITIAL_COURIERS_DATA), [fetchData]);
  const addCourier = useCallback((data: Omit<Courier, 'createdAt' | 'updatedAt'>) => addData<Courier, typeof data>('couriers', fetchCouriers, data, (d) => apiService.createEntity<Courier, typeof data>('couriers', d)), [addData, fetchCouriers]);
  const updateCourier = useCallback((id: string, data: Partial<Courier>) => updateData<Courier, typeof data>('couriers', id, fetchCouriers, data, (i,d) => apiService.updateEntity<Courier, typeof data>('couriers', i, d)), [updateData, fetchCouriers]);
  const deleteCourier = useCallback((id: string) => deleteData('couriers', id, fetchCouriers, (i) => apiService.deleteEntity('couriers', i)), [deleteData, fetchCouriers]);

  const fetchClients = useCallback(() => fetchData<Client>('clients', setClients, (p) => apiService.fetchEntityList<Client>('clients', p), undefined, undefined, INITIAL_CLIENTS_DATA), [fetchData]);
  const addClient = useCallback((data: Omit<Client, 'id'| 'createdAt' | 'updatedAt'>) => addData<Client, typeof data>('clients', fetchClients, data, (d) => apiService.createEntity<Client, typeof data>('clients', d)), [addData, fetchClients]);
  const updateClient = useCallback((id: number, data: Partial<Client>) => updateData<Client, typeof data>('clients', id, fetchClients, data, (i,d) => apiService.updateEntity<Client, typeof data>('clients', i, d)), [updateData, fetchClients]);
  const deleteClient = useCallback((id: number) => deleteData('clients', id, fetchClients, (i) => apiService.deleteEntity('clients', i)), [deleteData, fetchClients]);
  
  const fetchVehicles = useCallback(() => fetchData<Vehicle>('vehicles', setVehicles, (p) => apiService.fetchEntityList<Vehicle>('vehicles', p), undefined, undefined, INITIAL_VEHICLES_DATA), [fetchData]);
  const addVehicle = useCallback((data: Omit<Vehicle, 'createdAt' | 'updatedAt'>) => addData<Vehicle, typeof data>('vehicles', fetchVehicles, data, (d) => apiService.createEntity<Vehicle, typeof data>('vehicles', d)), [addData, fetchVehicles]);
  const updateVehicle = useCallback((id: string, data: Partial<Vehicle>) => updateData<Vehicle, typeof data>('vehicles', id, fetchVehicles, data, (i,d) => apiService.updateEntity<Vehicle, typeof data>('vehicles', i, d)), [updateData, fetchVehicles]);
  const deleteVehicle = useCallback((id: string) => deleteData('vehicles', id, fetchVehicles, (i) => apiService.deleteEntity('vehicles', i)), [deleteData, fetchVehicles]);

  const fetchDepotOpenRecords = useCallback((date: string) => fetchData<DepotOpenRecord>('depot-open', setDepotOpenRecords, () => apiService.fetchDepotOpenRecords(date), undefined, setIsLoadingDepotOpenRecords, INITIAL_DEPOT_OPEN_RECORDS_DATA.filter(r => r.date === date) as DepotOpenRecord[] ), [fetchData, setIsLoadingDepotOpenRecords]);
  const saveDepotOpenRecord = useCallback((record: Omit<DepotOpenRecord, 'id' | 'createdAt' | 'updatedAt'>) => addData<DepotOpenRecord, typeof record>('depot-open', () => fetchDepotOpenRecords(record.date), record, (d) => apiService.createEntity<DepotOpenRecord, typeof record>('depot-open', d)), [addData, fetchDepotOpenRecords]);
  
  const fetchWaves = useCallback(() => fetchData<WaveEntry>('waves', setWaves, (p) => apiService.fetchEntityList<WaveEntry>('waves', p), undefined, undefined, INITIAL_WAVES_DATA), [fetchData]);
  const addWaveEntry = useCallback((formData: FormData) => addData<WaveEntry, FormData>('waves', fetchWaves, formData, (d) => apiService.createEntityWithFiles<WaveEntry>('waves', d), true), [addData, fetchWaves]);
  const deleteWaveEntry = useCallback((id: string) => deleteData('waves', id, fetchWaves, (i) => apiService.deleteEntity('waves', i)), [deleteData, fetchWaves]);

  const fetchHhtAssets = useCallback(() => fetchData<HHTAsset>('hht-assets', setHhtAssets, (p) => apiService.fetchEntityList<HHTAsset>('hht-assets', p), undefined, undefined, INITIAL_HHT_ASSETS_DATA), [fetchData]);
  const addHHTAsset = useCallback((data: Omit<HHTAsset, 'createdAt' | 'updatedAt'>) => addData<HHTAsset, typeof data>('hht-assets', fetchHhtAssets, data, (d) => apiService.createEntity<HHTAsset, typeof data>('hht-assets', d)), [addData, fetchHhtAssets]);
  const updateHHTAsset = useCallback((serial_number: string, data: Partial<HHTAsset>) => updateData<HHTAsset, typeof data>('hht-assets', serial_number, fetchHhtAssets, data, (i,d) => apiService.updateEntity<HHTAsset, typeof data>('hht-assets', i, d)), [updateData, fetchHhtAssets]);
  const deleteHHTAsset = useCallback((serial_number: string) => deleteData('hht-assets', serial_number, fetchHhtAssets, (i) => apiService.deleteEntity('hht-assets', i)), [deleteData, fetchHhtAssets]);

  const fetchHhtLogins = useCallback(() => fetchData<HHTLogin>('hht-logins', setHhtLogins, (p) => apiService.fetchEntityList<HHTLogin>('hht-logins', p), undefined, undefined, INITIAL_HHT_LOGINS_DATA), [fetchData]);
  const addHHTLogin = useCallback((data: Omit<HHTLogin, 'createdAt' | 'updatedAt'| 'pin_hash'> & {pin:string}) => addData<HHTLogin, typeof data>('hht-logins', fetchHhtLogins, data, (d) => apiService.createEntity<HHTLogin, typeof data>('hht-logins', d)), [addData, fetchHhtLogins]);
  const updateHHTLogin = useCallback((login_id: string, data: Partial<Omit<HHTLogin, 'pin_hash'>> & {pin?:string}) => updateData<HHTLogin, typeof data>('hht-logins', login_id, fetchHhtLogins, data, (i,d) => apiService.updateEntity<HHTLogin, typeof data>('hht-logins', i, d)), [updateData, fetchHhtLogins]);
  const deleteHHTLogin = useCallback((login_id: string) => deleteData('hht-logins', login_id, fetchHhtLogins, (i) => apiService.deleteEntity('hht-logins', i)), [deleteData, fetchHhtLogins]);

  const fetchScanLogs = useCallback(() => fetchData<ScanLog>('scan-logs', setScanLogs, (p) => apiService.fetchEntityList<ScanLog>('scan-logs', p), undefined, undefined, INITIAL_SCAN_LOGS_DATA), [fetchData]);
  const addScanLog = useCallback((formData: FormData) => addData<ScanLog, FormData>('scan-logs', fetchScanLogs, formData, (d) => apiService.createEntityWithFiles<ScanLog>('scan-logs', d), true), [addData, fetchScanLogs]);
  const deleteScanLog = useCallback((id: string) => deleteData('scan-logs', id, fetchScanLogs, (i) => apiService.deleteEntity('scan-logs', i)), [deleteData, fetchScanLogs]);

  const fetchMissingParcelsLog = useCallback(() => fetchData<ParcelScanEntry>('missing-parcels', setMissingParcelsLog as any, (p) => apiService.fetchMissingParcelsLog(p), undefined, setIsLoadingMissingParcelsLog, INITIAL_MISSING_PARCELS_LOG_DATA), [fetchData, setIsLoadingMissingParcelsLog]);
  const addMissingParcelsToLog = useCallback((parcelsData: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>[]) => addData<ParcelScanEntry[], typeof parcelsData>('missing-parcels', fetchMissingParcelsLog, parcelsData, (d) => apiService.addMissingParcels(d)), [addData, fetchMissingParcelsLog]);
  const updateParcelInLog = useCallback((parcelId: string, updates: Partial<ParcelScanEntry>) => updateData<ParcelScanEntry, typeof updates>('missing-parcels', parcelId, fetchMissingParcelsLog, updates, (i,d) => apiService.updateMissingParcel(i as string,d)), [updateData, fetchMissingParcelsLog]);
  const deleteParcelFromLog = useCallback((parcelId: string) => deleteData('missing-parcels', parcelId, fetchMissingParcelsLog, (i) => apiService.deleteMissingParcel(i as string)), [deleteData, fetchMissingParcelsLog]);
  const markMissingParcelRecovered = useCallback(async (parcelId: string, recovered: boolean): Promise<ParcelScanEntry | null> => updateParcelInLog(parcelId, { is_recovered: recovered, recovery_date: recovered ? new Date().toISOString().split('T')[0] : null }), [updateParcelInLog]);

  const fetchPayPeriods = useCallback(() => fetchData<PayPeriod>('pay-periods', setPayPeriods, apiService.fetchPayPeriods, undefined, setIsLoadingPayPeriods, INITIAL_PAY_PERIODS_DATA), [fetchData, setIsLoadingPayPeriods]);
  const savePayPeriod = useCallback(async (periodData: Partial<PayPeriod>, isNew: boolean): Promise<PayPeriod | null> => {
    setIsLoadingPayPeriods(true);
    setError(null);
    try {
        const response = await apiService.savePayPeriod(periodData as PayPeriod, isNew ? undefined : periodData.id);
        await fetchPayPeriods(); 
        return response.data || null;
    } catch(e: any) {
        setError(`Failed to save pay period: ${e.message}`);
        return null;
    } finally {
        setIsLoadingPayPeriods(false);
    }
  }, [fetchPayPeriods, setIsLoadingPayPeriods, setError]);
  const deletePayPeriod = useCallback(async (id: string): Promise<boolean> => {
    setIsLoadingPayPeriods(true);
    setError(null);
    try {
        await apiService.deletePayPeriod(id);
        await fetchPayPeriods(); 
        return true;
    } catch(e: any) {
        setError(`Failed to delete pay period: ${e.message}`);
        return false;
    } finally {
        setIsLoadingPayPeriods(false);
    }
  }, [fetchPayPeriods, setIsLoadingPayPeriods, setError]);

  const fetchForecasts = useCallback(() => fetchData<Forecast>('forecasts', setForecasts, (p) => apiService.fetchEntityList<Forecast>('forecasts', p), undefined, setIsLoadingForecasts, INITIAL_FORECASTS_DATA), [fetchData, setIsLoadingForecasts]);
  const saveForecast = useCallback((forecast: Partial<Forecast>, isNew: boolean) => {
    if (isNew) return addData<Forecast, typeof forecast>('forecasts', fetchForecasts, forecast, (d) => apiService.createEntity<Forecast, typeof forecast>('forecasts', d));
    return updateData<Forecast, typeof forecast>('forecasts', forecast.id!, fetchForecasts, forecast, (i,d) => apiService.updateEntity<Forecast, typeof forecast>('forecasts', i, d));
  }, [addData, updateData, fetchForecasts]);
  const deleteForecast = useCallback((id: string) => deleteData('forecasts', id, fetchForecasts, (i) => apiService.deleteEntity('forecasts', i)), [deleteData, fetchForecasts]);

  const fetchWorkSchedules = useCallback((date?: string) => fetchData<WorkSchedule>('work-schedules', setWorkSchedules, (params) => apiService.fetchEntityList<WorkSchedule>('work-schedules', params), date ? {date} : undefined, setIsLoadingWorkSchedules, INITIAL_WORK_SCHEDULES_DATA), [fetchData, setIsLoadingWorkSchedules]);
  const saveWorkSchedule = useCallback((schedule: Partial<WorkSchedule>, isNew: boolean) => {
    if (isNew) return addData<WorkSchedule, typeof schedule>('work-schedules', () => fetchWorkSchedules(schedule.date), schedule, (d) => apiService.createEntity<WorkSchedule, typeof schedule>('work-schedules', d));
    return updateData<WorkSchedule, typeof schedule>('work-schedules', schedule.id!, () => fetchWorkSchedules(schedule.date), schedule, (i,d) => apiService.updateEntity<WorkSchedule, typeof schedule>('work-schedules', i, d));
  }, [addData, updateData, fetchWorkSchedules]);
  const deleteWorkSchedule = useCallback((id: string) => deleteData('work-schedules', id, () => fetchWorkSchedules(), (i) => apiService.deleteEntity('work-schedules', i)), [deleteData, fetchWorkSchedules]);

  const fetchInvoices = useCallback((filters?: {payPeriodId?: string, teamMemberId?: string, status?: string}) => fetchData<Invoice>('invoices', setInvoices, (params) => apiService.fetchEntityList<Invoice>('invoices', params), filters as Record<string,string> | undefined, setIsLoadingInvoices, INITIAL_INVOICES_DATA), [fetchData, setIsLoadingInvoices]);
  const saveInvoice = useCallback((formData: FormData, isNew: boolean, invoiceId?: string) => {
    if (isNew) return addData<Invoice, FormData>('invoices', fetchInvoices, formData, (d) => apiService.createEntityWithFiles<Invoice>('invoices', d), true);
    return updateData<Invoice, FormData>('invoices', invoiceId!, fetchInvoices, formData, (i,d) => apiService.updateEntityWithFiles<Invoice>('invoices', i, d), true);
  }, [addData, updateData, fetchInvoices]);
  const deleteInvoice = useCallback((id: string) => deleteData('invoices', id, fetchInvoices, (i) => apiService.deleteEntity('invoices', i)), [deleteData, fetchInvoices]);

  const fetchDucFinalReports = useCallback(() => fetchData<DUCFinalReport>('duc-final-reports', setDucFinalReports, (p) => apiService.fetchEntityList<DUCFinalReport>('duc-final-reports', p), undefined, undefined, INITIAL_DUC_FINAL_REPORTS_DATA), [fetchData]);
  const addDUCFinalReport = useCallback((formData: FormData) => addData<DUCFinalReport, FormData>('duc-final-reports', fetchDucFinalReports, formData, (d) => apiService.createEntityWithFiles<DUCFinalReport>('duc-final-reports', d), true), [addData, fetchDucFinalReports]);

  const fetchCageAudits = useCallback(() => fetchData<CageAuditEntry>('cage-audits', setCageAudits, (p) => apiService.fetchEntityList<CageAuditEntry>('cage-audits', p), undefined, undefined, INITIAL_CAGE_AUDITS_DATA), [fetchData]);
  const addCageAudit = useCallback((formData: FormData) => addData<CageAuditEntry, FormData>('cage-audits', fetchCageAudits, formData, (d) => apiService.createEntityWithFiles<CageAuditEntry>('cage-audits', d), true), [addData, fetchCageAudits]);

  const fetchCageReturnReports = useCallback(() => fetchData<CageReturnReport>('cage-return-reports', setCageReturnReports, (p) => apiService.fetchEntityList<CageReturnReport>('cage-return-reports', p), undefined, undefined, INITIAL_CAGE_RETURN_REPORTS_DATA), [fetchData]);
  const addOrUpdateCageReturnReport = useCallback((report: Partial<CageReturnReport>, isNew: boolean) => {
    if (isNew) return addData<CageReturnReport, typeof report>('cage-return-reports', fetchCageReturnReports, report, (d) => apiService.createEntity<CageReturnReport, typeof report>('cage-return-reports', d));
    return updateData<CageReturnReport, typeof report>('cage-return-reports', report.id!, fetchCageReturnReports, report, (i,d) => apiService.updateEntity<CageReturnReport, typeof report>('cage-return-reports', i, d));
  }, [addData, updateData, fetchCageReturnReports]);
  
  const fetchLostPreventionReports = useCallback(() => fetchData<LostPreventionReport>('lost-prevention-reports', setLostPreventionReports, (p) => apiService.fetchEntityList<LostPreventionReport>('lost-prevention-reports', p), undefined, undefined, INITIAL_LOST_PREVENTION_REPORTS_DATA), [fetchData]);
  const saveLostPreventionReport = useCallback((formData: FormData, isNew: boolean, reportId?:string) => {
    if (isNew) return addData<LostPreventionReport, FormData>('lost-prevention-reports', fetchLostPreventionReports, formData, (d) => apiService.createEntityWithFiles<LostPreventionReport>('lost-prevention-reports', d), true);
    if (!reportId) { setError("Report ID is required for update."); return Promise.resolve(null); }
    return updateData<LostPreventionReport, FormData>('lost-prevention-reports', reportId, fetchLostPreventionReports, formData, (i,d) => apiService.updateEntityWithFiles<LostPreventionReport>('lost-prevention-reports', i, d), true);
  }, [addData, updateData, fetchLostPreventionReports, setError]);
  const deleteLostPreventionReport = useCallback((id: string) => deleteData('lost-prevention-reports', id, fetchLostPreventionReports, (i) => apiService.deleteEntity('lost-prevention-reports', i)), [deleteData, fetchLostPreventionReports]);

  const fetchDailyMissortSummaryReports = useCallback(() => fetchData<DailyMissortSummaryReport>('daily-missort-summary-reports', setDailyMissortSummaryReports, (p) => apiService.fetchEntityList<DailyMissortSummaryReport>('daily-missort-summary-reports', p), undefined, undefined, INITIAL_DAILY_MISSORT_SUMMARY_REPORTS_DATA), [fetchData]);
  const addDailyMissortSummaryReport = useCallback((report: Omit<DailyMissortSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt'>) => addData<DailyMissortSummaryReport, typeof report>('daily-missort-summary-reports', fetchDailyMissortSummaryReports, report, (d) => apiService.createEntity<DailyMissortSummaryReport, typeof report>('daily-missort-summary-reports', d)), [addData, fetchDailyMissortSummaryReports]);

  const fetchWeeklyMissingSummaryReports = useCallback(() => fetchData<WeeklyMissingSummaryReport>('weekly-missing-summary-reports', setWeeklyMissingSummaryReports, (p) => apiService.fetchEntityList<WeeklyMissingSummaryReport>('weekly-missing-summary-reports', p), undefined, undefined, INITIAL_WEEKLY_MISSING_SUMMARY_REPORTS_DATA), [fetchData]);
  const addWeeklyMissingSummaryReport = useCallback((report: Omit<WeeklyMissingSummaryReport, 'id' | 'generated_at' | 'createdAt' | 'updatedAt'>) => addData<WeeklyMissingSummaryReport, typeof report>('weekly-missing-summary-reports', fetchWeeklyMissingSummaryReports, report, (d) => apiService.createEntity<WeeklyMissingSummaryReport, typeof report>('weekly-missing-summary-reports', d)), [addData, fetchWeeklyMissingSummaryReports]);
  
  const fetchWorstCourierPerformanceReports = useCallback(() => fetchData<WorstCourierPerformanceReport>('worst-courier-performance-reports', setWorstCourierPerformanceReports, (p) => apiService.fetchEntityList<WorstCourierPerformanceReport>('worst-courier-performance-reports', p), undefined, undefined, INITIAL_WORST_COURIER_PERFORMANCE_REPORTS_DATA), [fetchData]);
  const addWorstCourierPerformanceReport = useCallback((report: Omit<WorstCourierPerformanceReport, 'id' | 'generatedAt' | 'generatedBy'>) => addData<WorstCourierPerformanceReport, typeof report>('worst-courier-performance-reports', fetchWorstCourierPerformanceReports, report, (d) => apiService.createEntity<WorstCourierPerformanceReport, typeof report>('worst-courier-performance-reports', d)), [addData, fetchWorstCourierPerformanceReports]);

  const fetchWorstRoundPerformanceReports = useCallback(() => fetchData<WorstRoundPerformanceReport>('worst-round-performance-reports', setWorstRoundPerformanceReports, (p) => apiService.fetchEntityList<WorstRoundPerformanceReport>('worst-round-performance-reports', p), undefined, undefined, INITIAL_WORST_ROUND_PERFORMANCE_REPORTS_DATA), [fetchData]);
  const addWorstRoundPerformanceReport = useCallback((report: Omit<WorstRoundPerformanceReport, 'id' | 'generatedAt' | 'generatedBy'>) => addData<WorstRoundPerformanceReport, typeof report>('worst-round-performance-reports', fetchWorstRoundPerformanceReports, report, (d) => apiService.createEntity<WorstRoundPerformanceReport, typeof report>('worst-round-performance-reports', d)), [addData, fetchWorstRoundPerformanceReports]);

  const fetchClientMissingLeagueReports = useCallback(() => fetchData<ClientMissingLeagueReport>('client-missing-league-reports', setClientMissingLeagueReports, (p) => apiService.fetchEntityList<ClientMissingLeagueReport>('client-missing-league-reports', p), undefined, undefined, INITIAL_CLIENT_MISSING_LEAGUE_REPORTS_DATA), [fetchData]);
  const addClientMissingLeagueReport = useCallback((report: Omit<ClientMissingLeagueReport, 'id' | 'generatedAt' | 'generatedBy'>) => addData<ClientMissingLeagueReport, typeof report>('client-missing-league-reports', fetchClientMissingLeagueReports, report, (d) => apiService.createEntity<ClientMissingLeagueReport, typeof report>('client-missing-league-reports', d)), [addData, fetchClientMissingLeagueReports]);

  const fetchTopMisroutedDestinationsReports = useCallback(() => fetchData<TopMisroutedDestinationsReport>('top-misrouted-destinations-reports', setTopMisroutedDestinationsReports, (p) => apiService.fetchEntityList<TopMisroutedDestinationsReport>('top-misrouted-destinations-reports', p), undefined, undefined, INITIAL_TOP_MISROUTED_DESTINATIONS_REPORTS_DATA), [fetchData]);
  const addTopMisroutedDestinationsReport = useCallback((report: Omit<TopMisroutedDestinationsReport, 'id' | 'generatedAt' | 'generatedBy'>) => addData<TopMisroutedDestinationsReport, typeof report>('top-misrouted-destinations-reports', fetchTopMisroutedDestinationsReports, report, (d) => apiService.createEntity<TopMisroutedDestinationsReport, typeof report>('top-misrouted-destinations-reports', d)), [addData, fetchTopMisroutedDestinationsReports]);

  const fetchWorstCourierCarryForwardReports = useCallback(() => fetchData<WorstCourierCarryForwardReport>('worst-courier-carry-forward-reports', setWorstCourierCarryForwardReports, (p) => apiService.fetchEntityList<WorstCourierCarryForwardReport>('worst-courier-carry-forward-reports', p), undefined, undefined, INITIAL_WORST_COURIER_CARRY_FORWARD_REPORTS_DATA), [fetchData]);
  const addWorstCourierCarryForwardReport = useCallback((report: Omit<WorstCourierCarryForwardReport, 'id' | 'generatedAt' | 'generatedBy'>) => addData<WorstCourierCarryForwardReport, typeof report>('worst-courier-carry-forward-reports', fetchWorstCourierCarryForwardReports, report, (d) => apiService.createEntity<WorstCourierCarryForwardReport, typeof report>('worst-courier-carry-forward-reports', d)), [addData, fetchWorstCourierCarryForwardReports]);

  const fetchTimeslotTemplates = useCallback(() => fetchData<TimeslotTemplate>('timeslot-templates', setTimeslotTemplates, (p) => apiService.fetchEntityList<TimeslotTemplate>('timeslot-templates', p), undefined, undefined, INITIAL_TIMESLOT_TEMPLATES_DATA), [fetchData]);
  const addTimeslotTemplate = useCallback((data: Omit<TimeslotTemplate, 'id'| 'createdAt' | 'updatedAt'>) => addData<TimeslotTemplate, typeof data>('timeslot-templates', fetchTimeslotTemplates, data, (d) => apiService.createEntity<TimeslotTemplate, typeof data>('timeslot-templates', d)), [addData, fetchTimeslotTemplates]);
  const updateTimeslotTemplate = useCallback((id: string, data: Partial<TimeslotTemplate>) => updateData<TimeslotTemplate, typeof data>('timeslot-templates', id, fetchTimeslotTemplates, data, (i,d) => apiService.updateEntity<TimeslotTemplate, typeof data>('timeslot-templates', i, d)), [updateData, fetchTimeslotTemplates]);
  const deleteTimeslotTemplate = useCallback((id: string) => deleteData('timeslot-templates', id, fetchTimeslotTemplates, (i) => apiService.deleteEntity('timeslot-templates', i)), [deleteData, fetchTimeslotTemplates]);

  const fetchTimeslotAssignments = useCallback((date?: string) => fetchData<TimeslotAssignment>('timeslot-assignments', setTimeslotAssignments, (params) => apiService.fetchEntityList<TimeslotAssignment>('timeslot-assignments', params), date ? {date} : undefined, undefined, INITIAL_TIMESLOT_ASSIGNMENTS_DATA), [fetchData]);
  const saveTimeslotAssignment = useCallback((data: Omit<TimeslotAssignment, 'id'| 'createdAt' | 'updatedAt'>, id?: string) => {
    if (id) return updateData<TimeslotAssignment, typeof data>('timeslot-assignments', id, () => fetchTimeslotAssignments(data.date), data, (i,d) => apiService.updateEntity<TimeslotAssignment, typeof data>('timeslot-assignments', i, d));
    return addData<TimeslotAssignment, typeof data>('timeslot-assignments', () => fetchTimeslotAssignments(data.date), data, (d) => apiService.createEntity<TimeslotAssignment, typeof data>('timeslot-assignments', d));
  }, [addData, updateData, fetchTimeslotAssignments]);
  const deleteTimeslotAssignment = useCallback((id: string) => deleteData('timeslot-assignments', id, () => fetchTimeslotAssignments(), (i) => apiService.deleteEntity('timeslot-assignments', i)), [deleteData, fetchTimeslotAssignments]);

  const fetchEmailTriggers = useCallback(() => fetchData<EmailTrigger>('email-triggers', setEmailTriggers, (p) => apiService.fetchEntityList<EmailTrigger>('email-triggers', p), undefined, undefined, INITIAL_EMAIL_TRIGGERS_DATA), [fetchData]);
  const addEmailTrigger = useCallback((data: Omit<EmailTrigger, 'id'| 'createdAt' | 'updatedAt'| 'last_sent_at' | 'last_run_status' | 'last_error_message'>) => addData<EmailTrigger, typeof data>('email-triggers', fetchEmailTriggers, data, (d) => apiService.createEntity<EmailTrigger, typeof data>('email-triggers', d)), [addData, fetchEmailTriggers]);
  const updateEmailTrigger = useCallback((id: string, data: Partial<EmailTrigger>) => updateData<EmailTrigger, typeof data>('email-triggers', id, fetchEmailTriggers, data, (i,d) => apiService.updateEntity<EmailTrigger, typeof data>('email-triggers', i, d)), [updateData, fetchEmailTriggers]);
  const deleteEmailTrigger = useCallback((id: string) => deleteData('email-triggers', id, fetchEmailTriggers, (i) => apiService.deleteEntity('email-triggers', i)), [deleteData, fetchEmailTriggers]);

  const fetchAvailabilityRecords = useCallback((teamMemberId?: string, startDate?: string, endDate?:string) => {
    const params: Record<string,string> = {};
    if(teamMemberId) params.teamMemberId = teamMemberId;
    if(startDate) params.startDate = startDate;
    if(endDate) params.endDate = endDate;
    return fetchData<AvailabilityRecord>('availability', setAvailabilityRecords, (p) => apiService.fetchEntityList<AvailabilityRecord>('availability',p), params, undefined, INITIAL_AVAILABILITY_RECORDS_DATA);
  }, [fetchData]);

  const addOrUpdateAvailabilityRecord = useCallback(async (record: Omit<AvailabilityRecord, 'id'| 'createdAt' | 'updatedAt'>): Promise<AvailabilityRecord | null> => {
      return addData<AvailabilityRecord, typeof record>('availability', () => fetchAvailabilityRecords(record.team_member_id, record.date, record.date), record, (d) => apiService.createEntity<AvailabilityRecord, typeof record>('availability', d));
  }, [addData, fetchAvailabilityRecords]);
  const removeAvailabilityRecord = useCallback(async (teamMemberId: string, date: string): Promise<boolean> => {
      const recordIdToDelete = `${teamMemberId}__${date}`; 
      return deleteData('availability', recordIdToDelete, () => fetchAvailabilityRecords(teamMemberId), (compositeId) => apiService.deleteEntity('availability', compositeId));
  }, [deleteData, fetchAvailabilityRecords]);
  
  const getAvailabilityForMemberDate = useCallback((teamMemberId: string, date: string): AvailabilityRecord | undefined => {
    const record = availabilityRecords.find(ar => ar.team_member_id === teamMemberId && ar.date === date);
    return record;
  },[availabilityRecords]);

  const fetchScanData = useCallback(async (): Promise<void> => { 
    setIsLoading(true); 
    setError(null);
    try {
        const scanDataResponse = await apiService.fetchScanActivity(TODAY_DATE_STRING_GB); 
        setScanActivityData(scanDataResponse.data || INITIAL_SCAN_ACTIVITY_DATA);
    } catch (e: any) {
        console.error("Failed to refresh scan data:", e.message);
        setError(`Failed to fetch scan data: ${e.message}`);
        setScanActivityData(INITIAL_SCAN_ACTIVITY_DATA); 
    } finally {
        setIsLoading(false);
    }
  }, [setError, setIsLoading]); 

  const fetchForecastActivityData = useCallback(async (): Promise<void> => { 
    setIsLoading(true);
    setError(null);
    try {
        // This is still a placeholder
        await new Promise(resolve => setTimeout(resolve, 300)); 
        setForecastActivityData(INITIAL_FORECAST_ACTIVITY_DATA);
    } catch (e: any) {
        console.error("Failed to fetch forecast activity data:", e.message);
        setError(`Failed to fetch forecast activity data: ${e.message}`);
        setForecastActivityData(INITIAL_FORECAST_ACTIVITY_DATA);
    } finally {
        setIsLoading(false);
    }
  }, [setError, setIsLoading]); 

  const refreshScanData = useCallback(async (): Promise<void> => {
    await fetchScanData();
  }, [fetchScanData]);

  const refreshForecastActivityData = useCallback(async (): Promise<void> => {
    await fetchForecastActivityData();
  }, [fetchForecastActivityData]);

  const fetchAllInitialData = useCallback(async (): Promise<void> => {
    setIsLoading(true); setError(null);
    try {
      await Promise.all([
        fetchDeliveryUnits(), fetchSubDepots(), fetchTeam(), fetchRounds(), fetchCouriers(),
        fetchClients(), fetchVehicles(), fetchWaves(), fetchHhtAssets(), fetchHhtLogins(),
        fetchScanLogs(), fetchMissingParcelsLog(), fetchPayPeriods(), fetchForecasts(),
        fetchWorkSchedules(TODAY_DATE_STRING), fetchInvoices(), fetchDucFinalReports(),
        fetchTimeslotTemplates(), fetchTimeslotAssignments(TODAY_DATE_STRING), fetchEmailTriggers(),
        fetchAvailabilityRecords(), fetchCageAudits(), fetchCageReturnReports(),
        fetchLostPreventionReports(), fetchDailyMissortSummaryReports(), fetchWeeklyMissingSummaryReports(),
        fetchWorstCourierPerformanceReports(), fetchWorstRoundPerformanceReports(),
        fetchClientMissingLeagueReports(), fetchTopMisroutedDestinationsReports(),
        fetchWorstCourierCarryForwardReports(),
        fetchScanData(), fetchForecastActivityData(),
        fetchDepotOpenRecords(TODAY_DATE_STRING), 
      ]);
    } catch (e: any) {
      setError("Failed to load initial application data. Some features might not work correctly. " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [ 
      fetchDeliveryUnits, fetchSubDepots, fetchTeam, fetchRounds, fetchCouriers, 
      fetchClients, fetchVehicles, fetchWaves, fetchHhtAssets, fetchHhtLogins, 
      fetchScanLogs, fetchMissingParcelsLog, fetchPayPeriods, fetchForecasts, 
      fetchWorkSchedules, fetchInvoices, fetchDucFinalReports, 
      fetchTimeslotTemplates, fetchTimeslotAssignments, fetchEmailTriggers, 
      fetchAvailabilityRecords, fetchCageAudits, fetchCageReturnReports, 
      fetchLostPreventionReports, fetchDailyMissortSummaryReports, fetchWeeklyMissingSummaryReports, 
      fetchWorstCourierPerformanceReports, fetchWorstRoundPerformanceReports, 
      fetchClientMissingLeagueReports, fetchTopMisroutedDestinationsReports, 
      fetchWorstCourierCarryForwardReports, 
      fetchScanData, fetchForecastActivityData, fetchDepotOpenRecords, setIsLoading, setError 
  ]);

  const handleSeedDatabase = useCallback(async (): Promise<void> => { setIsSeeding(true); setSeedMessage(null); setStatusError(null); try { const result = await apiService.seedDatabase(); setSeedMessage(result.message || 'Seeding completed.'); if (result.data?.counts) { setDatabaseStatus(result.data.counts); } await fetchAllInitialData(); } catch (e: any) { setStatusError(e.message || "Failed to seed database."); setSeedMessage(null); } finally { setIsSeeding(false); }}, [fetchAllInitialData, setIsSeeding, setSeedMessage, setStatusError, setDatabaseStatus]);
  const handleCheckDatabaseStatus = useCallback(async (): Promise<void> => { setIsCheckingStatus(true); setStatusError(null); setSeedMessage(null); try { const result = await apiService.checkDatabaseStatus(); setDatabaseStatus(result.data || null); } catch (e: any) { setStatusError(e.message || "Failed to check database status."); setDatabaseStatus(null); } finally { setIsCheckingStatus(false); }}, [setIsCheckingStatus, setStatusError, setSeedMessage, setDatabaseStatus]);

  useEffect(() => {
    fetchAllInitialData();
  }, [fetchAllInitialData]);

  const value: SharedState = {
    deliveryUnits, setDeliveryUnits, fetchDeliveryUnits, addDeliveryUnit, updateDeliveryUnit, deleteDeliveryUnit,
    subDepots, setSubDepots, fetchSubDepots, addSubDepot, updateSubDepot, deleteSubDepot,
    team, setTeam, fetchTeam, saveTeamMember, deleteTeamMember, isLoadingTeam,
    rounds, setRounds, fetchRounds, addRound, updateRound, deleteRound,
    couriers, setCouriers, fetchCouriers, addCourier, updateCourier, deleteCourier,
    clients, setClients, fetchClients, addClient, updateClient, deleteClient,
    vehicles, setVehicles, fetchVehicles, addVehicle, updateVehicle, deleteVehicle,
    depotOpenRecords, fetchDepotOpenRecords, saveDepotOpenRecord, isLoadingDepotOpenRecords,
    waves, setWaves, fetchWaves, addWaveEntry, deleteWaveEntry,
    hhtAssets, setHhtAssets, fetchHhtAssets, addHHTAsset, updateHHTAsset, deleteHHTAsset,
    hhtLogins, setHhtLogins, fetchHhtLogins, addHHTLogin, updateHHTLogin, deleteHHTLogin,
    scanLogs, setScanLogs, fetchScanLogs, addScanLog, deleteScanLog,
    missingParcelsLog, setMissingParcelsLog, fetchMissingParcelsLog, isLoadingMissingParcelsLog,
    addMissingParcelsToLog, updateParcelInLog, deleteParcelFromLog, markMissingParcelRecovered,
    payPeriods, setPayPeriods, fetchPayPeriods, savePayPeriod, deletePayPeriod, isLoadingPayPeriods,
    forecasts, setForecasts, fetchForecasts, saveForecast, deleteForecast, isLoadingForecasts,
    workSchedules, setWorkSchedules, fetchWorkSchedules, saveWorkSchedule, deleteWorkSchedule, isLoadingWorkSchedules,
    invoices, setInvoices, fetchInvoices, saveInvoice, deleteInvoice, isLoadingInvoices,
    ducFinalReports, setDucFinalReports, fetchDucFinalReports, addDUCFinalReport,
    cageAudits, setCageAudits, fetchCageAudits, addCageAudit,
    cageReturnReports, setCageReturnReports, fetchCageReturnReports, addOrUpdateCageReturnReport,
    lostPreventionReports, setLostPreventionReports, fetchLostPreventionReports, saveLostPreventionReport, deleteLostPreventionReport,
    dailyMissortSummaryReports, setDailyMissortSummaryReports, fetchDailyMissortSummaryReports, addDailyMissortSummaryReport,
    weeklyMissingSummaryReports, setWeeklyMissingSummaryReports, fetchWeeklyMissingSummaryReports, addWeeklyMissingSummaryReport,
    worstCourierPerformanceReports, setWorstCourierPerformanceReports, addWorstCourierPerformanceReport, fetchWorstCourierPerformanceReports,
    worstRoundPerformanceReports, setWorstRoundPerformanceReports, addWorstRoundPerformanceReport, fetchWorstRoundPerformanceReports,
    clientMissingLeagueReports, setClientMissingLeagueReports, addClientMissingLeagueReport, fetchClientMissingLeagueReports,
    topMisroutedDestinationsReports, setTopMisroutedDestinationsReports, addTopMisroutedDestinationsReport, fetchTopMisroutedDestinationsReports,
    worstCourierCarryForwardReports, setWorstCourierCarryForwardReports, addWorstCourierCarryForwardReport, fetchWorstCourierCarryForwardReports,
    timeslotTemplates, setTimeslotTemplates, fetchTimeslotTemplates, addTimeslotTemplate, updateTimeslotTemplate, deleteTimeslotTemplate,
    timeslotAssignments, setTimeslotAssignments, fetchTimeslotAssignments, saveTimeslotAssignment, deleteTimeslotAssignment,
    emailTriggers, setEmailTriggers, fetchEmailTriggers, addEmailTrigger, updateEmailTrigger, deleteEmailTrigger,
    availabilityRecords, setAvailabilityRecords, fetchAvailabilityRecords, addOrUpdateAvailabilityRecord, removeAvailabilityRecord, getAvailabilityForMemberDate,
    alertConfigs, setAlertConfigs, scanActivityData, setScanActivityData, forecastActivityData, setForecastActivityData,
    isLoading, error, setError,
    fetchScanData, fetchForecastActivityData,
    refreshScanData, refreshForecastActivityData, 
    currentCourierForWorkflow, setCurrentCourierForWorkflow, activeTab, setActiveTab, dailyOpsView, setDailyOpsView,
    isSeeding, seedMessage, isCheckingStatus, databaseStatus, statusError, handleSeedDatabase, handleCheckDatabaseStatus, clearSeedMessage,
    headerSearchInputRef, focusHeaderSearchInput,
  };

  return React.createElement(SharedStateContext.Provider, { value }, children);
};

export const useSharedState = (): SharedState => {
  const context = useContext(SharedStateContext);
  if (context === undefined) {
    throw new Error('useSharedState must be used within a SharedStateProvider');
  }
  return context;
};
