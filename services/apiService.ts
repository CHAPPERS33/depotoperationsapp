// services/apiService.ts
import { 
    TeamMember, PayPeriod, Forecast, WorkSchedule, Invoice, 
    /* DepotOpenApiResponseItem - removed */ ParcelScanEntry, DatabaseStatusCounts,
    
    
    
    
    
    
    
    ApiResponse, ScanActivity, DepotOpenRecord // Added DepotOpenRecord
} from '../types'; // Corrected relative path

const API_BASE_URL = '/api'; 

async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type");
  let responseData;

  if (contentType && contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    if (response.status === 204) return { status: response.status, data: null as unknown as T };
    const textResponse = await response.text();
    // Attempt to parse if it might be JSON without correct header
    try {
        responseData = JSON.parse(textResponse);
    } catch (e) {
        // If not JSON, wrap text in a message object or return as part of error
        if (response.ok) return { status: response.status, message: textResponse, data: textResponse as unknown as T}; // Treat as success if status is OK
        responseData = { message: textResponse }; // Wrap text in a message object for error
    }
  }
  
  if (!response.ok) {
    const errorMsg = responseData?.message || responseData?.error || `API Error: ${response.status} ${response.statusText}`;
    const errorToThrow = new Error(errorMsg);
    (errorToThrow as any).status = response.status;
    (errorToThrow as any).details = responseData?.details;
    throw errorToThrow;
  }
  
  // Ensure the structure matches ApiResponse<T>
  if (responseData && responseData.data !== undefined && responseData.status !== undefined) {
    return responseData as ApiResponse<T>;
  }
  // If responseData is the data itself (common for simple GETs or successful POSTs returning the object)
  return { data: responseData, status: response.status };
}


// Generic CRUD functions
export const fetchEntityList = async <T>(entityName: string, params?: Record<string, string>): Promise<ApiResponse<T[]>> => {
  const query = params ? new URLSearchParams(params).toString() : '';
  const response = await fetch(`${API_BASE_URL}/${entityName}${query ? `?${query}`: ''}`);
  return handleApiResponse<T[]>(response);
};

export const fetchEntityById = async <T>(entityName: string, id: string | number): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}/${id}`);
  return handleApiResponse<T>(response);
};

export const createEntity = async <TResponse, TPayload>(entityName: string, data: TPayload): Promise<ApiResponse<TResponse>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleApiResponse<TResponse>(response);
};

export const createEntityWithFiles = async <TResponse>(entityName: string, formData: FormData): Promise<ApiResponse<TResponse>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}`, {
    method: 'POST',
    body: formData, 
  });
  return handleApiResponse<TResponse>(response);
};

export const updateEntity = async <TResponse, TPayload>(entityName: string, id: string | number, data: TPayload): Promise<ApiResponse<TResponse>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleApiResponse<TResponse>(response);
};

export const updateEntityWithFiles = async <TResponse>(entityName: string, id: string | number, formData: FormData): Promise<ApiResponse<TResponse>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}/${id}`, {
    method: 'PUT',
    body: formData,
  });
  return handleApiResponse<TResponse>(response);
};

export const deleteEntity = async (entityName: string, id: string | number): Promise<ApiResponse<{ message: string }>> => {
  const response = await fetch(`${API_BASE_URL}/${entityName}/${id}`, { method: 'DELETE' });
  if (response.status === 204) return { message: `${entityName} with ID ${id} deleted successfully.`, status: 204 };
  return handleApiResponse<{ message: string }>(response);
};


// Specific entity service functions (using generic helpers)

// Team Members
export const fetchTeamMembers = async (): Promise<ApiResponse<TeamMember[]>> => fetchEntityList<TeamMember>('team');
export const saveTeamMember = async (member: Partial<TeamMember>, isNew: boolean): Promise<ApiResponse<TeamMember>> => {
  if (isNew) {
    return createEntity<TeamMember, Partial<Omit<TeamMember, 'id'>>>('team', member);
  } else {
    if (!member.id) throw new Error("Member ID is required for update.");
    return updateEntity<TeamMember, Partial<Omit<TeamMember, 'id'>>>('team', member.id, member);
  }
};
export const deleteTeamMember = async (memberId: string): Promise<ApiResponse<{ message: string }>> => deleteEntity('team', memberId);

// Pay Periods
export const fetchPayPeriods = async (): Promise<ApiResponse<PayPeriod[]>> => fetchEntityList<PayPeriod>('pay-periods');
export const savePayPeriod = async (periodData: Partial<PayPeriod>, idToUpdate?: string ): Promise<ApiResponse<PayPeriod>> => {
  const isNew = !idToUpdate && !('id' in periodData && periodData.id);
  if (isNew) {
    return createEntity<PayPeriod, Omit<PayPeriod, 'id' | 'createdAt' | 'updatedAt'>>('pay-periods', periodData as Omit<PayPeriod, 'id' | 'createdAt' | 'updatedAt'>);
  } else {
    const id = idToUpdate || (periodData as PayPeriod).id;
    if (!id) throw new Error("Pay Period ID is required for update.");
    return updateEntity<PayPeriod, PayPeriod>('pay-periods', id, periodData as PayPeriod);
  }
};
export const deletePayPeriod = async (id: string): Promise<ApiResponse<{ message: string }>> => deleteEntity('pay-periods', id);

// Depot Open Records
export const fetchDepotOpenRecords = async (date: string): Promise<ApiResponse<DepotOpenRecord[]>> => { // Changed to DepotOpenRecord[]
  return fetchEntityList<DepotOpenRecord>('depot-open', { date });
};

// Missing Parcels Log (ParcelScanEntry)
export const fetchMissingParcelsLog = async (params?: Record<string, string>): Promise<ApiResponse<ParcelScanEntry[]>> => fetchEntityList<ParcelScanEntry>('missing-parcels', params);
export const addMissingParcels = async (parcelsData: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>[]): Promise<ApiResponse<ParcelScanEntry[]>> => createEntity<ParcelScanEntry[], typeof parcelsData>('missing-parcels', parcelsData);
export const updateMissingParcel = async (logId: string, updates: Partial<ParcelScanEntry>): Promise<ApiResponse<ParcelScanEntry>> => updateEntity<ParcelScanEntry, Partial<ParcelScanEntry>>('missing-parcels', logId, updates);
export const deleteMissingParcel = async (logId: string): Promise<ApiResponse<{ message: string }>> => deleteEntity('missing-parcels', logId);

// Scan Activity (Summary - GET only usually, POST for raw logs)
export const fetchScanActivity = async (date: string, userId?: string): Promise<ApiResponse<ScanActivity[]>> => { 
  const params: Record<string, string> = { date };
  if (userId) params.userId = userId;
  return fetchEntityList<ScanActivity>('scan-activity', params);
};

// Database Seeding/Status
export const seedDatabase = async (): Promise<ApiResponse<{ message: string; counts?: Record<string, { count: number }> }>> => {
  const response = await fetch(`${API_BASE_URL}/seed`, { method: 'POST' });
  return handleApiResponse<{ message: string; counts?: Record<string, { count: number }> }>(response);
};
export const checkDatabaseStatus = async (): Promise<ApiResponse<DatabaseStatusCounts>> => {
  const response = await fetch(`${API_BASE_URL}/seed`); // GET by default
  return handleApiResponse<DatabaseStatusCounts>(response);
};


// Added Forecasts, WorkSchedules, Invoices using generic fetcher
export const fetchForecasts = async (params?: Record<string, string>): Promise<ApiResponse<Forecast[]>> => 
  fetchEntityList<Forecast>('forecasts', params);

export const fetchWorkSchedules = async (params?: Record<string, string>): Promise<ApiResponse<WorkSchedule[]>> => 
  fetchEntityList<WorkSchedule>('work-schedules', params);

export const fetchInvoices = async (params?: Record<string, string>): Promise<ApiResponse<Invoice[]>> => 
  fetchEntityList<Invoice>('invoices', params);

// Note: Other specific entity functions (Forecasts, WorkSchedules, Invoices, etc.) can be added here 
// following the pattern above, or the generic functions can be used directly in useSharedState hook.
