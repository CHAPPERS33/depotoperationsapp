
// components/dailyOps/WorkScheduleManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { WorkSchedule } from '../../types';
import { Plus, Trash2, Edit, ScanLine, Check, AlertTriangle } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { generateTeamScheduleWhatsAppMessage, WhatsAppShareButton } from '../../utils/whatsappUtils';
import { TODAY_DATE_STRING, TOMORROW_DATE_STRING, TODAY_DATE_STRING_GB } from '../../constants';
import { fetchScanActivity as apiFetchScanActivity } from '../../services/apiService';

const initialWorkScheduleFormState: Partial<WorkSchedule> = {
  date: TODAY_DATE_STRING, 
  team_member_id: '',
  sub_depot_id: 0,
  scheduled_hours: 0,
  actual_hours: null,
  shift_start_time: '',
  shift_end_time: '',
  is_confirmed: false,
  notes: '',
  forecast_id: undefined
};

const WorkScheduleManager: React.FC = () => {
  const {
    workSchedules, setWorkSchedules, // Directly using setWorkSchedules for local updates
    team,
    subDepots,
    forecasts,
    depotOpenRecords, // Changed from depotOpenLog
    getAvailabilityForMemberDate,
    fetchWorkSchedules: apiFetchWorkSchedules, // To fetch initial/refresh data
    saveWorkSchedule: apiSaveWorkSchedule,     // To save to backend
    deleteWorkSchedule: apiDeleteWorkSchedule, // To delete from backend
    isLoadingWorkSchedules: isLoadingSchedulesFromHook, // Loading state from hook
  } = useSharedState();

  const [showWorkScheduleModal, setShowWorkScheduleModal] = useState<boolean>(false);
  const [editingWorkSchedule, setEditingWorkSchedule] = useState<WorkSchedule | null>(null);
  const [currentWorkScheduleData, setCurrentWorkScheduleData] = useState<Partial<WorkSchedule>>(() => ({
    ...initialWorkScheduleFormState,
    sub_depot_id: subDepots[0]?.id || 0,
  }));
  const [workScheduleFormError, setWorkScheduleFormError] = useState<string | null>(null);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  const [isLoadingComponent, setIsLoadingComponent] = useState<boolean>(false); // Local loading for form submission
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(TODAY_DATE_STRING);

  const [scanActivityData, setScanActivityData] = useState<Record<string, { totalScans: number | null }>>({});
  const [isLoadingScanActivity, setIsLoadingScanActivity] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetchWorkSchedules(selectedScheduleDate);
  }, [selectedScheduleDate, apiFetchWorkSchedules]);


  const filteredWorkSchedules = workSchedules.filter(ws => ws.date === selectedScheduleDate);

  useEffect(() => {
    if (showWorkScheduleModal && currentWorkScheduleData.team_member_id && currentWorkScheduleData.date) {
      const availability = getAvailabilityForMemberDate(currentWorkScheduleData.team_member_id, currentWorkScheduleData.date);
      if (availability?.status === 'Unavailable') {
        setAvailabilityWarning(
          `⚠️ ${team.find(tm => tm.id === currentWorkScheduleData.team_member_id)?.name || 'Member'} has marked this day as UNAVAILABLE. ${availability.notes ? `(Notes: ${availability.notes})` : ''}`
        );
      } else {
        setAvailabilityWarning(null);
      }
    } else {
      setAvailabilityWarning(null);
    }
  }, [showWorkScheduleModal, currentWorkScheduleData.team_member_id, currentWorkScheduleData.date, getAvailabilityForMemberDate, team]);

  useEffect(() => {
    if (!currentWorkScheduleData.forecast_id && showWorkScheduleModal && !editingWorkSchedule && currentWorkScheduleData.team_member_id && currentWorkScheduleData.date) {
      const selectedTeamMember = team.find(tm => tm.id === currentWorkScheduleData.team_member_id);
      const scheduleDateObj = new Date(currentWorkScheduleData.date + "T00:00:00Z");
      const dayOfWeek = scheduleDateObj.getUTCDay();

      let prefillStartTime = currentWorkScheduleData.shift_start_time || '';
      let prefillEndTime = currentWorkScheduleData.shift_end_time || '';
      let prefillScheduledHours: number | string = currentWorkScheduleData.scheduled_hours || 0;

      if (selectedTeamMember) {
        const globalDepotOpenTimeToday = depotOpenRecords.find(
          (log) => log.date === currentWorkScheduleData.date && log.sub_depot_id === null
        )?.time;

        switch (selectedTeamMember.position) {
          case 'Sorter':
            if (dayOfWeek === 0) { prefillScheduledHours = 0; prefillStartTime = ''; prefillEndTime = ''; } 
            else if (dayOfWeek === 6) { prefillStartTime = '07:00'; prefillEndTime = '12:00'; prefillScheduledHours = 5; } 
            else { prefillStartTime = '07:00'; prefillEndTime = '15:30'; prefillScheduledHours = 8.5; }
            break;
          case 'DUC':
            if (dayOfWeek === 0) { prefillScheduledHours = 0; prefillStartTime = ''; prefillEndTime = ''; } 
            else if (dayOfWeek === 6) { prefillStartTime = '08:00'; prefillEndTime = '13:00'; prefillScheduledHours = 5; } 
            else { prefillStartTime = '08:00'; prefillEndTime = '16:30'; prefillScheduledHours = 8.5; }
            break;
          case 'Marshall':
            if (globalDepotOpenTimeToday) {
                const [hours, minutes] = globalDepotOpenTimeToday.split(':').map(Number);
                const startDate = new Date(); startDate.setHours(hours, minutes, 0, 0);
                const marshallStartTime = new Date(startDate.getTime() + 30 * 60000);
                const marshallEndTime = new Date(marshallStartTime.getTime() + 6 * 60 * 60000);
                prefillStartTime = `${String(marshallStartTime.getHours()).padStart(2, '0')}:${String(marshallStartTime.getMinutes()).padStart(2, '0')}`;
                prefillEndTime = `${String(marshallEndTime.getHours()).padStart(2, '0')}:${String(marshallEndTime.getMinutes()).padStart(2, '0')}`;
                prefillScheduledHours = 6;
            } else if (dayOfWeek === 0 || dayOfWeek === 6) { prefillScheduledHours = 0; prefillStartTime = ''; prefillEndTime = ''; }
             else { prefillStartTime = '08:00'; prefillEndTime = '14:00'; prefillScheduledHours = 6; }
            break;
          default: break;
        }

        setCurrentWorkScheduleData(prev => ({
          ...prev,
          shift_start_time: prefillStartTime,
          shift_end_time: prefillEndTime,
          scheduled_hours: typeof prefillScheduledHours === 'string' ? parseFloat(prefillScheduledHours) : prefillScheduledHours,
        }));
      }
    }
  }, [showWorkScheduleModal, editingWorkSchedule, currentWorkScheduleData.team_member_id, currentWorkScheduleData.date, team, depotOpenRecords, currentWorkScheduleData.forecast_id]);

  useEffect(() => {
    if (currentWorkScheduleData.forecast_id && currentWorkScheduleData.date && showWorkScheduleModal) {
      const selectedForecast = forecasts.find(f => f.id === currentWorkScheduleData.forecast_id);
      if (selectedForecast && selectedForecast.forecast_for_date === currentWorkScheduleData.date) {
        if (selectedForecast.planned_shift_length !== null && selectedForecast.planned_shift_length !== undefined) {
          setCurrentWorkScheduleData(prev => ({
            ...prev,
            scheduled_hours: selectedForecast.planned_shift_length,
          }));
        }
      } else if (selectedForecast && selectedForecast.forecast_for_date !== currentWorkScheduleData.date) {
        setCurrentWorkScheduleData(prev => ({ ...prev, forecast_id: undefined }));
      }
    }
  }, [currentWorkScheduleData.forecast_id, currentWorkScheduleData.date, forecasts, showWorkScheduleModal]);

  useEffect(() => {
    if (currentWorkScheduleData.shift_start_time && currentWorkScheduleData.shift_end_time) {
      const startTime = currentWorkScheduleData.shift_start_time;
      const endTime = currentWorkScheduleData.shift_end_time;
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      if (![startH, startM, endH, endM].some(isNaN)) {
        let totalStartMinutes = startH * 60 + startM;
        let totalEndMinutes = endH * 60 + endM;
        if (totalEndMinutes < totalStartMinutes) totalEndMinutes += 24 * 60;
        const durationMinutes = totalEndMinutes - totalStartMinutes;
        if (durationMinutes >= 0 && durationMinutes <= 24 * 60) {
          const durationInHours = parseFloat((durationMinutes / 60).toFixed(2));
          if (currentWorkScheduleData.scheduled_hours !== durationInHours) {
             setCurrentWorkScheduleData(prev => ({ ...prev, scheduled_hours: durationInHours }));
          }
        }
      }
    }
  }, [currentWorkScheduleData.shift_start_time, currentWorkScheduleData.shift_end_time]);

  const handleWorkScheduleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'scheduled_hours' || name === 'actual_hours') {
        const numValue = parseFloat(value);
        setCurrentWorkScheduleData(prev => ({ ...prev, [name]: isNaN(numValue) ? null : numValue }));
    } else if (name === 'sub_depot_id') {
        setCurrentWorkScheduleData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else if (name === 'forecast_id' && value === "") {
        setCurrentWorkScheduleData(prev => ({ ...prev, [name]: undefined }));
    } else {
         setCurrentWorkScheduleData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }
  };

  const handleSaveWorkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkScheduleFormError(null);
    if (!currentWorkScheduleData.date || !currentWorkScheduleData.team_member_id || !currentWorkScheduleData.sub_depot_id) {
      setWorkScheduleFormError("Date, Team Member, and Sub Depot are required.");
      return;
    }
    if( (currentWorkScheduleData.scheduled_hours || 0) <= 0 && (!currentWorkScheduleData.shift_start_time || !currentWorkScheduleData.shift_end_time) ){
      setWorkScheduleFormError("Either Scheduled Hours (>0) or both Start and End times must be provided.");
      return;
    }

    setIsLoadingComponent(true);
    const saved = await apiSaveWorkSchedule(currentWorkScheduleData, !editingWorkSchedule);
    if (saved) {
      setShowWorkScheduleModal(false);
      setEditingWorkSchedule(null);
      setAvailabilityWarning(null);
      alert(editingWorkSchedule ? 'Work Schedule updated successfully!' : 'Work Schedule created successfully!');
    } else {
      setWorkScheduleFormError('Failed to save work schedule. Check API logs.');
    }
    setIsLoadingComponent(false);
  };

  const handleEditWorkSchedule = (schedule: WorkSchedule) => {
    setEditingWorkSchedule(schedule);
    setCurrentWorkScheduleData({
      ...schedule,
      actual_hours: schedule.actual_hours === undefined ? null : schedule.actual_hours,
      forecast_id: schedule.forecast_id === null ? undefined : schedule.forecast_id,
    });
    setWorkScheduleFormError(null);
    setShowWorkScheduleModal(true);
  };

  const handleDeleteWorkSchedule = async (id: string) => {
    if (!confirm(`Are you sure you want to delete work schedule ${id.slice(-6)}?`)) return;
    setIsLoadingComponent(true);
    const success = await apiDeleteWorkSchedule(id);
    if (success) {
      alert('Work Schedule deleted successfully!');
    } else {
      alert('Failed to delete work schedule.');
    }
    setIsLoadingComponent(false);
  };

  const handleFetchScanActivity = async (userId: string, date: string) => {
    const key = `${userId}-${date}`;
    setIsLoadingScanActivity(prev => ({ ...prev, [key]: true }));
    try {
      const activityResponse = await apiFetchScanActivity(TODAY_DATE_STRING_GB, userId); // Use GB date for fetching scan activity
      const userScanActivity = activityResponse.data?.find(act => act.userId === userId && act.date === TODAY_DATE_STRING_GB);
      setScanActivityData(prev => ({ ...prev, [key]: { totalScans: userScanActivity?.totalScanned ?? null } }));
    } catch (error) {
      console.error("Failed to fetch scan activity:", error);
      setScanActivityData(prev => ({ ...prev, [key]: { totalScans: null } }));
    } finally {
      setIsLoadingScanActivity(prev => ({ ...prev, [key]: false }));
    }
  };

  const WorkScheduleWhatsAppWrapper: React.FC<{ schedules: WorkSchedule[], date: string }> = ({ schedules, date }) => {
      const depotOpenTime = depotOpenRecords.find(log => log.date === date && log.sub_depot_id === null)?.time;
      const message = generateTeamScheduleWhatsAppMessage(schedules, date, team, subDepots, depotOpenTime);
      return (
        <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Share Schedule for {new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB')}</h4>
          <WhatsAppShareButton message={message} label="Share Schedule" className="mb-2"/>
          <details className="text-xs text-blue-700 cursor-pointer">
            <summary className="hover:text-blue-800 focus:outline-none">Preview message</summary>
            <pre className="mt-2 whitespace-pre-wrap bg-white p-2 rounded-md border text-gray-700 text-xs">{message}</pre>
          </details>
        </div>
      );
  };

  const totalsForDate = filteredWorkSchedules.reduce(
    (acc, ws) => {
      acc.scheduled += ws.scheduled_hours || 0;
      acc.actual += ws.actual_hours || 0;
      return acc;
    },
    { scheduled: 0, actual: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Manage Work Schedules</h2>
           <div className="flex items-center gap-2">
             <label htmlFor="schedule-date-filter" className="text-sm font-medium text-gray-700">Date:</label>
             <input
                type="date"
                id="schedule-date-filter"
                value={selectedScheduleDate}
                onChange={e => setSelectedScheduleDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            <Button
              onClick={() => {
                setEditingWorkSchedule(null);
                setCurrentWorkScheduleData({
                    ...initialWorkScheduleFormState,
                    date: TOMORROW_DATE_STRING, // Default to tomorrow for new entries
                    sub_depot_id: subDepots[0]?.id || 0 
                });
                setWorkScheduleFormError(null);
                setAvailabilityWarning(null);
                setShowWorkScheduleModal(true);
              }}
              variant="primary"
              leftIcon={Plus}
              disabled={isLoadingSchedulesFromHook || isLoadingComponent}
            >
              Add Schedule
            </Button>
          </div>
        </div>
         {workScheduleFormError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300 mb-4">{workScheduleFormError}</p>}

        {filteredWorkSchedules.length > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                <h3 className="text-md font-semibold text-indigo-700">Summary for {new Date(selectedScheduleDate + 'T00:00:00Z').toLocaleDateString('en-GB')}:</h3>
                <p className="text-sm text-indigo-600">Total Staff: {filteredWorkSchedules.length}</p>
                <p className="text-sm text-indigo-600">Total Scheduled Hours: {totalsForDate.scheduled.toFixed(1)}</p>
                <p className="text-sm text-indigo-600">Total Actual Hours: {totalsForDate.actual > 0 ? totalsForDate.actual.toFixed(1) : 'N/A'}</p>
            </div>
        )}

        {filteredWorkSchedules.length > 0 && <WorkScheduleWhatsAppWrapper schedules={filteredWorkSchedules} date={selectedScheduleDate} />}


        {isLoadingSchedulesFromHook && <p className="text-center py-4">Loading schedules...</p>}
        {!isLoadingSchedulesFromHook && filteredWorkSchedules.length === 0 && <p className="text-gray-500 text-center py-4">No work schedules found for {new Date(selectedScheduleDate + 'T00:00:00Z').toLocaleDateString('en-GB')}.</p>}

        {!isLoadingSchedulesFromHook && filteredWorkSchedules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Member', 'Sub-Depot', 'Shift Time', 'Sched. Hrs', 'Actual Hrs', 'Forecast ID', 'Scan Totals', 'Confirmed', 'Notes', 'Actions'].map(header => (
                     <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkSchedules.map(ws => {
                    const teamMember = team.find(tm => tm.id === ws.team_member_id);
                    const subDepot = subDepots.find(sd => sd.id === ws.sub_depot_id);
                    const forecast = forecasts.find(f => f.id === ws.forecast_id);
                    const scanKey = `${ws.team_member_id}-${ws.date}`;
                    const currentScanData = scanActivityData[scanKey];
                    const availability = getAvailabilityForMemberDate(ws.team_member_id, ws.date);

                    return (
                        <React.Fragment key={ws.id}>
                        <tr className={`hover:bg-gray-50 ${availability?.status === 'Unavailable' ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                              {teamMember?.name || ws.team_member_id} <span className="text-xs text-gray-500">({teamMember?.position})</span>
                              {availability?.status === 'Unavailable' && (
                                <div className="text-xs text-red-600 flex items-center gap-1" title={`Unavailable ${availability.notes ? '- Notes: ' + availability.notes : ''}`}>
                                  <AlertTriangle size={12} /> Unavailable
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{subDepot?.name || ws.sub_depot_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{ws.shift_start_time && ws.shift_end_time ? `${ws.shift_start_time} - ${ws.shift_end_time}` : 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">{ws.scheduled_hours?.toFixed(1)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">{ws.actual_hours != null ? ws.actual_hours.toFixed(1) : 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{forecast ? `FC#${forecast.id.slice(-4)} (${new Date(forecast.forecast_for_date+'T00:00:00Z').toLocaleDateString('en-GB')})` : 'N/A'}</td>
                             <td className="px-4 py-3 text-sm">
                                {currentScanData?.totalScans != null ? (
                                    <span className="font-semibold">{currentScanData.totalScans} scans</span>
                                ) : (
                                    <Button onClick={() => handleFetchScanActivity(ws.team_member_id, ws.date)} size="sm" variant="ghost" leftIcon={ScanLine} isLoading={isLoadingScanActivity[scanKey]} disabled={isLoadingScanActivity[scanKey]}>
                                        {isLoadingScanActivity[scanKey] ? 'Fetching...' : 'Get Scans'}
                                    </Button>
                                )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-center">{ws.is_confirmed ? <Check className="text-green-600 mx-auto" size={18}/> : 'No'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={ws.notes || undefined}>{ws.notes || '—'}</td>
                            <td className="px-4 py-3 text-sm space-x-2 whitespace-nowrap">
                                <Button onClick={() => handleEditWorkSchedule(ws)} variant="ghost" size="sm" title="Edit"><Edit size={16}/></Button>
                                <Button onClick={() => handleDeleteWorkSchedule(ws.id)} variant="ghost" size="sm" title="Delete" className="text-red-600 hover:text-red-700" isLoading={isLoadingComponent}><Trash2 size={16}/></Button>
                            </td>
                        </tr>
                        </React.Fragment>
                    )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showWorkScheduleModal} onClose={() => { setShowWorkScheduleModal(false); setEditingWorkSchedule(null); setAvailabilityWarning(null); }} title={editingWorkSchedule ? `Edit Schedule for ${team.find(tm => tm.id === currentWorkScheduleData.team_member_id)?.name || 'Member'}` : 'Add New Work Schedule'} size="2xl">
        <form onSubmit={handleSaveWorkSchedule} className="space-y-4">
          {availabilityWarning && (
            <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm flex items-center gap-2">
              <AlertTriangle size={18}/> {availabilityWarning}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="ws-date" className="block text-sm font-medium text-gray-700">Date</label><input type="date" name="date" id="ws-date" value={currentWorkScheduleData.date || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" required /></div>
            <div><label htmlFor="ws-team_member_id" className="block text-sm font-medium text-gray-700">Team Member</label><select name="team_member_id" id="ws-team_member_id" value={currentWorkScheduleData.team_member_id || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" required><option value="">-- Select Member --</option>{team.map(tm => <option key={tm.id} value={tm.id}>{tm.name} ({tm.position})</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="ws-sub_depot_id" className="block text-sm font-medium text-gray-700">Sub-Depot</label><select name="sub_depot_id" id="ws-sub_depot_id" value={currentWorkScheduleData.sub_depot_id || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" required>{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div>
            <div><label htmlFor="ws-forecast_id" className="block text-sm font-medium text-gray-700">Link to Forecast (Optional)</label>
                <select name="forecast_id" id="ws-forecast_id" value={currentWorkScheduleData.forecast_id || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full">
                    <option value="">-- None --</option>
                    {forecasts
                        .filter(f => f.forecast_for_date === currentWorkScheduleData.date)
                        .map(fc => <option key={fc.id} value={fc.id}>FC#{fc.id.slice(-4)} - {fc.total_volume} vol.</option>)
                    }
                </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="ws-shift_start_time" className="block text-sm font-medium text-gray-700">Shift Start Time</label><input type="time" name="shift_start_time" id="ws-shift_start_time" value={currentWorkScheduleData.shift_start_time || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"/></div>
            <div><label htmlFor="ws-shift_end_time" className="block text-sm font-medium text-gray-700">Shift End Time</label><input type="time" name="shift_end_time" id="ws-shift_end_time" value={currentWorkScheduleData.shift_end_time || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"/></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="ws-scheduled_hours" className="block text-sm font-medium text-gray-700">Scheduled Hours</label><input type="number" name="scheduled_hours" id="ws-scheduled_hours" value={currentWorkScheduleData.scheduled_hours || ''} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" step="0.1" placeholder="e.g. 8.5"/></div>
            <div><label htmlFor="ws-actual_hours" className="block text-sm font-medium text-gray-700">Actual Hours (Override)</label><input type="number" name="actual_hours" id="ws-actual_hours" value={currentWorkScheduleData.actual_hours === null ? '' : currentWorkScheduleData.actual_hours} onChange={handleWorkScheduleFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" step="0.1" placeholder="e.g. 8.0"/></div>
          </div>
          <div><label htmlFor="ws-notes" className="block text-sm font-medium text-gray-700">Notes</label><textarea name="notes" id="ws-notes" value={currentWorkScheduleData.notes || ''} onChange={handleWorkScheduleFormChange} rows={2} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"></textarea></div>
          <div className="flex items-center"><input type="checkbox" name="is_confirmed" id="ws-is_confirmed" checked={currentWorkScheduleData.is_confirmed || false} onChange={handleWorkScheduleFormChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/><label htmlFor="ws-is_confirmed" className="ml-2 block text-sm text-gray-900">Schedule Confirmed</label></div>
          {workScheduleFormError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{workScheduleFormError}</p>}

          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="outline" onClick={() => { setShowWorkScheduleModal(false); setEditingWorkSchedule(null); setWorkScheduleFormError(null); setAvailabilityWarning(null); }}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isLoadingComponent || isLoadingSchedulesFromHook} disabled={isLoadingComponent || isLoadingSchedulesFromHook}>{editingWorkSchedule ? 'Save Changes' : 'Add Schedule'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkScheduleManager;
