
// components/dailyOps/ForecastManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Forecast, ForecastVolume, SubDepot } from '../../types';
import { Plus, Trash2, Edit, RotateCcw } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal'; 
import { generateForecastWhatsAppMessage, WhatsAppShareButton } from '../../utils/whatsappUtils';
import { TODAY_DATE_STRING } from '../../constants';

const PRODUCTIVITY_RATE = 300;

interface ForecastFormData extends Omit<Partial<Forecast>, 'volumes' | 'calculated_hours' | 'planned_shift_length' | 'pay_period_info' | 'createdAt' | 'updatedAt'> {
  calculated_hours?: number | string | null; 
  planned_shift_length?: number | string | null; 
  planned_shift_start_time?: string | null;
  planned_shift_end_time?: string | null;
  volumes?: Partial<ForecastVolume>[]; // Changed to Partial<ForecastVolume>
}

const getInitialFormData = (subDepots: SubDepot[]): ForecastFormData => ({ 
  forecast_for_date: new Date().toISOString().slice(0,10), 
  pay_period_id: undefined, 
  total_volume: 0, 
  calculated_hours: 0,
  planned_shift_length: null,
  planned_shift_start_time: null,
  planned_shift_end_time: null,
  notes: '', 
  volumes: subDepots.length > 0 ? [{ sub_depot_id: subDepots[0].id, volume: 0, notes: undefined }] : []
});


const ForecastManager: React.FC = () => {
  const { 
    forecasts, 
    payPeriods, 
    subDepots,
    depotOpenRecords, // Changed from depotOpenLog
    fetchForecasts, 
    isLoadingForecasts,
    saveForecast: apiSaveForecast, 
    deleteForecast: apiDeleteForecast 
  } = useSharedState();

  const [showForecastModal, setShowForecastModal] = useState<boolean>(false);
  const [editingForecast, setEditingForecast] = useState<Forecast | null>(null);
  
  const [currentForecastData, setCurrentForecastData] = useState<ForecastFormData>(getInitialFormData(subDepots));
  const [displayPlannedDuration, setDisplayPlannedDuration] = useState<string>('');
  const [forecastFormError, setForecastFormError] = useState<string | null>(null);
  const [isComponentLoading, setIsComponentLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentForecastData.volumes && currentForecastData.volumes.length > 0) {
      const sum = currentForecastData.volumes.reduce((acc, vol) => acc + (Number(vol.volume) || 0), 0);
      const newCalculatedHours = sum > 0 ? parseFloat((sum / PRODUCTIVITY_RATE).toFixed(2)) : 0;
      setCurrentForecastData(prev => ({
        ...prev, 
        total_volume: sum,
        calculated_hours: prev.calculated_hours === undefined || prev.calculated_hours === null || prev.calculated_hours === '' || parseFloat(String(prev.calculated_hours)) === parseFloat(((prev.total_volume || 0) / PRODUCTIVITY_RATE).toFixed(2))
            ? newCalculatedHours 
            : prev.calculated_hours 
      }));
    } else if (currentForecastData.volumes?.length === 0) {
      setCurrentForecastData(prev => ({...prev, total_volume: 0, calculated_hours: 0 }));
    }
  }, [currentForecastData.volumes]);
  
  useEffect(() => {
    const { planned_shift_start_time, planned_shift_end_time } = currentForecastData;
    if (planned_shift_start_time && planned_shift_end_time) {
      const [startH, startM] = planned_shift_start_time.split(':').map(Number);
      const [endH, endM] = planned_shift_end_time.split(':').map(Number);

      if (![startH, startM, endH, endM].some(isNaN)) {
        let totalStartMinutes = startH * 60 + startM;
        let totalEndMinutes = endH * 60 + endM;

        if (totalEndMinutes < totalStartMinutes) { 
          totalEndMinutes += 24 * 60;
        }
        
        const durationMinutes = totalEndMinutes - totalStartMinutes;
        if (durationMinutes > 0 && durationMinutes <= 24 * 60) { 
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            const durationInHours = parseFloat((durationMinutes / 60).toFixed(2));
            
            setCurrentForecastData(prev => ({ ...prev, planned_shift_length: durationInHours }));
            setDisplayPlannedDuration(`${hours}h ${minutes}m`);
            return;
        }
      }
    }
    if (currentForecastData.planned_shift_length && displayPlannedDuration) {
        // No need to clear if times are invalid, user might manually input shift length
    }
    // setDisplayPlannedDuration(''); // Keep display duration if times are removed, user might have manually set length
  }, [currentForecastData.planned_shift_start_time, currentForecastData.planned_shift_end_time, currentForecastData.planned_shift_length]);


  const handleForecastFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'planned_shift_length' || name === 'calculated_hours') {
        const valueStr = value.trim();
        let parsedNumValue: number | string | null = null;
        if (valueStr === '') {
            parsedNumValue = null;
        } else {
            const num = parseFloat(valueStr);
            parsedNumValue = isNaN(num) ? valueStr : num; 
        }
        setCurrentForecastData(prev => ({ ...prev, [name]: parsedNumValue }));
    } else if (name === 'planned_shift_start_time' || name === 'planned_shift_end_time') {
        setCurrentForecastData(prev => ({ ...prev, [name]: value || null }));
    } else if (name === 'pay_period_id' && value === "") {
         setCurrentForecastData(prev => ({ ...prev, pay_period_id: undefined }));
    }
    else {
        setCurrentForecastData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleForecastVolumeChange = (index: number, field: keyof ForecastVolume, value: string | number) => {
    const updatedVolumes = [...(currentForecastData.volumes || [])];
    if(updatedVolumes[index]){
      if (field === 'volume') {
        const valueStr = String(value).trim();
        if (valueStr === '') {
          updatedVolumes[index] = { ...updatedVolumes[index], volume: 0 }; 
        } else {
          const num = parseFloat(valueStr);
          updatedVolumes[index] = { ...updatedVolumes[index], volume: isNaN(num) ? 0 : num };
        }
      } else if (field === 'sub_depot_id') {
        updatedVolumes[index] = { ...updatedVolumes[index], sub_depot_id: parseInt(String(value)) };
      } else if (field === 'notes') {
        updatedVolumes[index] = { ...updatedVolumes[index], notes: String(value) || undefined };
      }
      setCurrentForecastData(prev => ({ ...prev, volumes: updatedVolumes }));
    }
  };

  const addForecastVolumeRow = () => {
    const newVolumeEntry: Partial<ForecastVolume> = { 
        sub_depot_id: subDepots[0]?.id || 0, 
        volume: 0,
        notes: undefined
    };
    setCurrentForecastData(prev => ({ ...prev, volumes: [...(prev.volumes || []), newVolumeEntry] }));
  };

  const removeForecastVolumeRow = (index: number) => {
    setCurrentForecastData(prev => ({ ...prev, volumes: (prev.volumes || []).filter((_, i) => i !== index) }));
  };

  const handleSaveForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setForecastFormError(null);
    setIsComponentLoading(true);
    if (!currentForecastData.forecast_for_date) {
      setForecastFormError("Forecast date is required.");
      setIsComponentLoading(false);
      return;
    }
    if (currentForecastData.volumes?.some(v => !v.sub_depot_id || (typeof v.volume !== 'number' && v.volume !== null) )) {
        setForecastFormError("All sub-depot volumes must have a sub-depot selected. Volume must be a number.");
        setIsComponentLoading(false);
        return;
    }
     if (currentForecastData.volumes?.some(v => v.volume !== null && Number(v.volume) < 0 )) {
        setForecastFormError("Volume cannot be negative.");
        setIsComponentLoading(false);
        return;
    }
    const finalCalculatedHours = currentForecastData.calculated_hours === null || currentForecastData.calculated_hours === '' ? null : parseFloat(String(currentForecastData.calculated_hours));
    const finalPlannedShiftLength = currentForecastData.planned_shift_length === null || currentForecastData.planned_shift_length === '' ? null : parseFloat(String(currentForecastData.planned_shift_length));

    const payload: Partial<Forecast> = { 
      id: editingForecast?.id,
      forecast_for_date: currentForecastData.forecast_for_date!,
      pay_period_id: currentForecastData.pay_period_id || undefined, 
      total_volume: Number(currentForecastData.total_volume) || 0,
      calculated_hours: finalCalculatedHours,
      planned_shift_length: finalPlannedShiftLength,
      notes: currentForecastData.notes || '',
      volumes: currentForecastData.volumes?.map(v => ({
          // id and forecast_id will be handled by backend or are omitted for new entries
          sub_depot_id: v.sub_depot_id!, // Assuming sub_depot_id is always present
          volume: Number(v.volume) || 0,
          notes: v.notes
      })) as ForecastVolume[] || [], // Cast here if types for backend differ slightly for creation
    };
    
    const saved = await apiSaveForecast(payload, !editingForecast);

    if (saved) {
        setShowForecastModal(false);
        setEditingForecast(null);
        setCurrentForecastData(getInitialFormData(subDepots));
        setDisplayPlannedDuration('');
        alert(editingForecast ? 'Forecast updated successfully!' : 'Forecast created successfully!');
    } else {
        setForecastFormError('Failed to save forecast. Please check console for details from API.');
    }
    setIsComponentLoading(false);
  };

  const handleEditForecast = (forecastToEdit: Forecast) => {
    setEditingForecast(forecastToEdit);
    const volumesForForm: Partial<ForecastVolume>[] = forecastToEdit.volumes && forecastToEdit.volumes.length > 0 
        ? forecastToEdit.volumes.map(v => ({ sub_depot_id: v.sub_depot_id, volume: v.volume as number, notes: v.notes }))
        : (subDepots.length > 0 ? [{ sub_depot_id: subDepots[0].id, volume: 0, notes: undefined }] : []);

    setCurrentForecastData({ 
      ...forecastToEdit, 
      pay_period_id: forecastToEdit.pay_period_id || undefined,
      calculated_hours: forecastToEdit.calculated_hours,
      planned_shift_length: forecastToEdit.planned_shift_length,
      planned_shift_start_time: null, 
      planned_shift_end_time: null,
      volumes: volumesForForm
    });
    setDisplayPlannedDuration('');
    setForecastFormError(null);
    setShowForecastModal(true);
  };

  const handleDeleteForecast = async (id: string) => {
    if (!confirm(`Are you sure you want to delete forecast ${id.slice(-6)}?`)) return;
    setIsComponentLoading(true);
    const success = await apiDeleteForecast(id);
    if(success){
        alert('Forecast deleted successfully!');
    } else {
        alert('Failed to delete forecast.');
    }
    setIsComponentLoading(false);
  };
  
  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  const ForecastWhatsAppShareWrapper: React.FC<{ forecast: Forecast }> = ({ forecast }) => {
    const depotOpenTime = depotOpenRecords.find(log => log.date === forecast.forecast_for_date && log.sub_depot_id === null)?.time;
    const message = generateForecastWhatsAppMessage(forecast, subDepots, depotOpenTime);
    return (
      <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Share Forecast for {new Date(forecast.forecast_for_date + 'T00:00:00Z').toLocaleDateString('en-GB')}</h4>
        <WhatsAppShareButton message={message} label="Share Forecast" className="mb-2" />
        <details className="text-xs text-blue-700 cursor-pointer">
          <summary className="hover:text-blue-800 focus:outline-none">Preview message</summary>
          <pre className="mt-2 whitespace-pre-wrap bg-white p-2 rounded-md border text-gray-700 text-xs">{message}</pre>
        </details>
      </div>
    );
  };

  const isTimeInputValid = currentForecastData.planned_shift_start_time && currentForecastData.planned_shift_end_time && displayPlannedDuration;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Manage Forecasts</h2>
          <div className="flex gap-2">
             <Button onClick={fetchForecasts} variant="outline" leftIcon={RotateCcw} isLoading={isLoadingForecasts} disabled={isLoadingForecasts || isComponentLoading}>Refresh Data</Button>
            <Button onClick={() => { setEditingForecast(null); setCurrentForecastData(getInitialFormData(subDepots)); setDisplayPlannedDuration(''); setForecastFormError(null); setShowForecastModal(true); }} variant="primary" leftIcon={Plus} disabled={isLoadingForecasts || isComponentLoading}>Add Forecast</Button>
          </div>
        </div>
        {isLoadingForecasts && <p className="text-center py-4">Loading forecasts...</p>}
        {forecastFormError && !isLoadingForecasts && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300 mb-4">{forecastFormError}</p>}
        {!isLoadingForecasts && forecasts.length === 0 && <p className="text-gray-500 text-center py-4">No forecasts found. Click "Add Forecast" to create one.</p>}
        {!isLoadingForecasts && forecasts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>{['Date', 'Pay Period', 'Total Volume', 'Est. Hrs (Calc)', 'Planned Shift', 'Sub-Depot Volumes', 'Notes', 'Actions'].map(header => (<th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>))}</tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecasts.map(f => {
                    return (
                        <React.Fragment key={f.id}>
                        <tr className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">{new Date(f.forecast_for_date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{f.pay_period_info || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">{f.total_volume?.toLocaleString() || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">{f.calculated_hours != null ? `${Number(f.calculated_hours).toFixed(2)}h` : 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">{f.planned_shift_length != null ? `${Number(f.planned_shift_length).toFixed(2)}h` : 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{f.volumes && f.volumes.length > 0 ? (<ul className="text-xs list-disc list-inside">{f.volumes.map((vol, idx) => <li key={idx}>{subDepots.find(sd=>sd.id===vol.sub_depot_id)?.name.replace('Sub Depot ','S') || `S${vol.sub_depot_id}`}: {vol.volume.toLocaleString()}</li>)}</ul>) : 'Overall'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={f.notes || undefined}>{f.notes || '—'}</td>
                            <td className="px-4 py-3 text-sm space-x-2 whitespace-nowrap"><Button onClick={() => handleEditForecast(f)} variant="ghost" size="sm" title="Edit"><Edit size={16}/></Button><Button onClick={() => handleDeleteForecast(f.id)} variant="ghost" size="sm" title="Delete" className="text-red-600 hover:text-red-700" isLoading={isComponentLoading}><Trash2 size={16}/></Button><ForecastWhatsAppShareWrapper forecast={f} /></td>
                        </tr>
                        </React.Fragment>
                    )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal isOpen={showForecastModal} onClose={() => { setShowForecastModal(false); setEditingForecast(null); setDisplayPlannedDuration(''); setForecastFormError(null); }} title={editingForecast ? `Edit Forecast for ${new Date((currentForecastData.forecast_for_date || TODAY_DATE_STRING) + 'T00:00:00Z').toLocaleDateString('en-GB')}` : 'Add New Forecast'} size="3xl">
        <form onSubmit={handleSaveForecast} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="fc-date" className="block text-sm font-medium text-gray-700">Forecast For Date</label><input type="date" name="forecast_for_date" id="fc-date" value={currentForecastData.forecast_for_date || ''} onChange={handleForecastFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" required /></div>
            <div><label htmlFor="fc-pay_period_id" className="block text-sm font-medium text-gray-700">Pay Period (Optional)</label><select name="pay_period_id" id="fc-pay_period_id" value={currentForecastData.pay_period_id || ''} onChange={handleForecastFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"><option value="">-- None --</option>{payPeriods.map(pp => <option key={pp.id} value={pp.id}>{pp.period_number}/{pp.year}</option>)}</select></div>
          </div>
          <div className="border p-3 rounded-md bg-gray-50">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Volume by Sub-Depot</h4>
            {(currentForecastData.volumes || []).map((vol, index) => (<div key={index} className="grid grid-cols-12 gap-2 mb-2 items-start"><div className="col-span-5"><label className="text-xs sr-only">Sub-Depot</label><select value={vol.sub_depot_id} onChange={(e) => handleForecastVolumeChange(index, 'sub_depot_id', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md text-sm"><option value={0}>-- Select Sub-Depot --</option>{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div><div className="col-span-3"><label className="text-xs sr-only">Volume</label><input type="number" placeholder="Volume" value={vol.volume === null ? '' : vol.volume} onChange={(e) => handleForecastVolumeChange(index, 'volume', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md text-sm" min="0"/></div><div className="col-span-3"><label className="text-xs sr-only">Notes</label><input type="text" placeholder="Notes" value={vol.notes || ''} onChange={(e) => handleForecastVolumeChange(index, 'notes', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md text-sm"/></div><div className="col-span-1 text-right"><Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeForecastVolumeRow(index)}><Trash2 size={14}/></Button></div></div>))}
            <Button type="button" variant="outline" size="sm" leftIcon={Plus} onClick={addForecastVolumeRow}>Add Sub-Depot Volume</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="fc-total_volume" className="block text-sm font-medium text-gray-700">Total Volume (Auto-calculated)</label><input type="number" name="total_volume" id="fc-total_volume" value={currentForecastData.total_volume || 0} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full bg-gray-100" readOnly /></div>
            <div><label htmlFor="fc-calculated_hours" className="block text-sm font-medium text-gray-700">Est. Shift Length (Calculated Hours)</label><input type="number" name="calculated_hours" id="fc-calculated_hours" value={currentForecastData.calculated_hours === null ? '' : currentForecastData.calculated_hours} onChange={handleForecastFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full" step="0.01" placeholder="e.g. 7.5"/></div>
          </div>
          <div className="border p-3 rounded-md bg-blue-50">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Planned Shift Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div><label htmlFor="fc-planned_shift_start_time" className="block text-sm font-medium text-gray-700">Planned Shift Start Time</label><input type="time" name="planned_shift_start_time" id="fc-planned_shift_start_time" value={currentForecastData.planned_shift_start_time || ''} onChange={handleForecastFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"/></div>
                <div><label htmlFor="fc-planned_shift_end_time" className="block text-sm font-medium text-gray-700">Planned Shift End Time</label><input type="time" name="planned_shift_end_time" id="fc-planned_shift_end_time" value={currentForecastData.planned_shift_end_time || ''} onChange={handleForecastFormChange} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 items-center">
                <div><label htmlFor="fc-planned_shift_length" className="block text-sm font-medium text-gray-700">Planned Shift Length (hours)</label><input type="number" name="planned_shift_length" id="fc-planned_shift_length" value={currentForecastData.planned_shift_length === null ? '' : currentForecastData.planned_shift_length} onChange={handleForecastFormChange} className={`mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full ${isTimeInputValid ? 'bg-gray-100' : ''}`} step="0.1" min="0" placeholder="e.g. 8.5" disabled={Boolean(isTimeInputValid)}/></div>
                <div><label className="block text-sm font-medium text-gray-700">Calculated Duration</label><input type="text" value={displayPlannedDuration || 'N/A'} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full bg-gray-100" readOnly /></div>
            </div>
          </div>
          <div><label htmlFor="fc-notes" className="block text-sm font-medium text-gray-700">Notes</label><textarea name="notes" id="fc-notes" value={currentForecastData.notes || ''} onChange={handleForecastFormChange} rows={2} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"></textarea></div>
          {forecastFormError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{forecastFormError}</p>}
          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="outline" onClick={() => { setShowForecastModal(false); setEditingForecast(null); setDisplayPlannedDuration(''); setForecastFormError(null); }}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isComponentLoading || isLoadingForecasts} disabled={Boolean(isComponentLoading || isLoadingForecasts)}>{editingForecast ? 'Save Changes' : 'Add Forecast'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ForecastManager;
