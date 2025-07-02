
// components/dailyOps/DepotOpenManager.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { DepotOpenRecord, SubDepot } from '../../types'; // Removed DepotOpenApiResponseItem as it's no longer used
import { Save, Plus, Edit, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { TODAY_DATE_STRING } from '../../constants';

const DepotOpenManager: React.FC = () => {
  const { 
    depotOpenRecords, // Changed from apiDepotOpenRecords
    fetchDepotOpenRecords,
    saveDepotOpenRecord,
    subDepots,
    isLoadingDepotOpenRecords, // Changed from isLoadingApiDepotOpenRecords
    error: apiError, 
    setError: setApiError 
  } = useSharedState();

  const [selectedDate, setSelectedDate] = useState<string>(TODAY_DATE_STRING);
  
  const [globalTime, setGlobalTime] = useState<string>('');
  const [globalNotes, setGlobalNotes] = useState<string>('');
  const [globalTeamMemberId, setGlobalTeamMemberId] = useState<string>('');


  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [currentOverride, setCurrentOverride] = useState<Partial<DepotOpenRecord>>({});
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchDepotOpenRecords(selectedDate);
  }, [selectedDate, fetchDepotOpenRecords]);

  const globalRecordForSelectedDate = useMemo(() => 
    depotOpenRecords.find(r => r.date === selectedDate && r.sub_depot_id === null),
    [depotOpenRecords, selectedDate]
  );

  const overridesForSelectedDate = useMemo(() =>
    depotOpenRecords.filter(r => r.date === selectedDate && r.sub_depot_id !== null),
    [depotOpenRecords, selectedDate]
  );

  useEffect(() => {
    if (globalRecordForSelectedDate) {
      setGlobalTime(globalRecordForSelectedDate.time);
      setGlobalNotes(globalRecordForSelectedDate.notes || '');
      setGlobalTeamMemberId(globalRecordForSelectedDate.team_member_id || '');
    } else {
      setGlobalTime('');
      setGlobalNotes('');
      setGlobalTeamMemberId('');
    }
    setSuccessMessage(null); // Clear success on date change or record load
    setLocalError(null);   // Clear local error
  }, [globalRecordForSelectedDate, selectedDate]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const displaySuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setLocalError(null);
    setApiError(null); // Clear general API error if one existed
  };
  
  const displayErrorMessage = (message: string) => {
    setLocalError(message);
    setSuccessMessage(null);
  }

  const handleSaveGlobal = async () => {
    if (!globalTime) {
      displayErrorMessage('Global open time is required.');
      return;
    }
    setIsSubmitting(true);
    const recordToSave: Omit<DepotOpenRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: selectedDate,
      time: globalTime,
      notes: globalNotes.trim() || undefined,
      sub_depot_id: null,
      team_member_id: globalTeamMemberId || null,
    };

    const result = await saveDepotOpenRecord(recordToSave);
    if (result) {
      displaySuccessMessage(`Global open time for ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-GB')} saved.`);
    } else {
      displayErrorMessage(apiError || 'Failed to save global open time.');
    }
    setIsSubmitting(false);
  };

  const handleOpenOverrideModal = (overrideToEdit?: DepotOpenRecord) => {
    if (overrideToEdit) {
      setEditingOverrideId(overrideToEdit.id!);
      setCurrentOverride({ ...overrideToEdit });
    } else {
      setEditingOverrideId(null);
      setCurrentOverride({ 
        sub_depot_id: subDepots[0]?.id, 
        time: '', 
        notes: '',
        team_member_id: '',
      });
    }
    setIsOverrideModalOpen(true);
  };

  const handleOverrideChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentOverride(prev => ({ ...prev, [name]: name === 'sub_depot_id' ? parseInt(value) : value }));
  };

  const handleSaveOverride = async () => {
    if (!currentOverride.sub_depot_id || !currentOverride.time) {
      displayErrorMessage('Sub-Depot and specific open time are required for an override.');
      return;
    }
    setIsSubmitting(true);
    const recordToSave: Omit<DepotOpenRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: selectedDate,
      time: currentOverride.time!,
      notes: currentOverride.notes?.trim() || undefined,
      sub_depot_id: Number(currentOverride.sub_depot_id),
      team_member_id: currentOverride.team_member_id || null,
    };
    
    const result = await saveDepotOpenRecord(recordToSave);
    if(result) {
        setIsOverrideModalOpen(false);
        const subDepotName = subDepots.find(sd => sd.id === Number(currentOverride.sub_depot_id))?.name || `Sub-Depot ${currentOverride.sub_depot_id}`;
        displaySuccessMessage(`${subDepotName} override for ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-GB')} ${editingOverrideId ? 'updated' : 'saved'}.`);
    } else {
        displayErrorMessage(apiError || 'Failed to save override.');
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteOverride = async (overrideId: string) => {
     // For now, this functionality would require a DELETE /api/depot-open/[id] endpoint
     // and corresponding function in useSharedState.
     // Placeholder:
     alert('Delete functionality for specific overrides not yet fully implemented with API.');
     // Example local removal (will be reverted on next fetch if not API backed):
     // setDepotOpenRecords(prev => prev.filter(r => r.id !== overrideId));
     // displaySuccessMessage('Sub-Depot override marked for deletion (locally).');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-2 text-center">Manage Depot Opening Times</h2>
        
        {localError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{localError}</div>}
        {apiError && !localError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{apiError}</div>}
        {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center gap-2 text-sm"><CheckCircle2 size={18} />{successMessage}</div>}
        
        <div className="mb-6">
          <label htmlFor="depotOpenDateSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Date to Manage:</label>
          <input type="date" id="depotOpenDateSelect" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm p-2" max={TODAY_DATE_STRING}/>
        </div>

        {isLoadingDepotOpenRecords && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Loading opening times...</div>}

        {!isLoadingDepotOpenRecords && (
          <>
            <div className="p-4 border border-gray-200 rounded-lg mb-6 bg-slate-50">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Global Opening Time for {new Date(selectedDate+'T00:00:00Z').toLocaleDateString('en-GB')}</h3>
              <div className="space-y-3">
                <div><label htmlFor="globalOpenTime" className="block text-sm font-medium text-gray-700">Time:</label><input type="time" id="globalOpenTime" value={globalTime} onChange={e => setGlobalTime(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>
                <div><label htmlFor="globalTeamMemberId" className="block text-sm font-medium text-gray-700">Recorded By (Optional):</label><input type="text" id="globalTeamMemberId" value={globalTeamMemberId} onChange={e => setGlobalTeamMemberId(e.target.value)} placeholder="Team Member ID or Name" className="mt-1 block w-full p-2 border rounded-md"/></div>
                <div><label htmlFor="globalNotes" className="block text-sm font-medium text-gray-700">Notes (Optional):</label><textarea id="globalNotes" value={globalNotes} onChange={e => setGlobalNotes(e.target.value)} rows={2} className="mt-1 block w-full p-2 border rounded-md"/></div>
                <div className="text-right"><Button onClick={handleSaveGlobal} variant="primary" leftIcon={Save} isLoading={isSubmitting} disabled={isSubmitting}>Save Global Time</Button></div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-medium text-gray-800">Specific Sub-Depot Times for {new Date(selectedDate+'T00:00:00Z').toLocaleDateString('en-GB')}</h3><Button onClick={() => handleOpenOverrideModal()} variant="outline" leftIcon={Plus} size="sm">Add Specific</Button></div>
              {overridesForSelectedDate.length === 0 ? (<p className="text-sm text-gray-500 text-center py-3">No specific sub-depot opening times set for this date.</p>) : (
                <ul className="space-y-2">
                  {overridesForSelectedDate.map(override => {
                    const subDepot = subDepots.find(sd => sd.id === override.sub_depot_id);
                    return (
                      <li key={override.id} className="p-3 border rounded-md bg-white flex justify-between items-center">
                        <div><p className="font-semibold text-gray-700">{subDepot?.name || `Sub-Depot ID: ${override.sub_depot_id}`}: <span className="text-blue-600">{override.time}</span></p>{override.notes && <p className="text-xs text-gray-500 mt-0.5">Notes: {override.notes}</p>}{override.team_member_id && <p className="text-xs text-gray-500">By: {override.team_member_id}</p>}</div>
                        <div className="space-x-1">
                          <Button onClick={() => handleOpenOverrideModal(override)} variant="ghost" size="sm" aria-label="Edit override"><Edit size={16}/></Button>
                          {/* <Button onClick={() => handleDeleteOverride(override.id!)} variant="ghost" size="sm" className="text-red-500" aria-label="Delete override"><Trash2 size={16}/></Button> */}
                        </div>
                      </li>);})}
                </ul>)}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isOverrideModalOpen} onClose={() => setIsOverrideModalOpen(false)} title={editingOverrideId ? 'Edit Specific Sub-Depot Time' : 'Add Specific Sub-Depot Time'} size="md">
        <div className="space-y-4">
          <div><label htmlFor="overrideSubDepotId" className="block text-sm font-medium text-gray-700">Sub-Depot:</label><select name="sub_depot_id" id="overrideSubDepotId" value={currentOverride.sub_depot_id || ''} onChange={handleOverrideChange} className="mt-1 block w-full p-2 border rounded-md">{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div>
          <div><label htmlFor="overrideTime" className="block text-sm font-medium text-gray-700">Specific Open Time:</label><input type="time" name="time" id="overrideTime" value={currentOverride.time || ''} onChange={handleOverrideChange} className="mt-1 block w-full p-2 border rounded-md"/></div>
          <div><label htmlFor="overrideTeamMemberId" className="block text-sm font-medium text-gray-700">Recorded By (Optional):</label><input type="text" name="team_member_id" id="overrideTeamMemberId" value={currentOverride.team_member_id || ''} onChange={handleOverrideChange} placeholder="Team Member ID or Name" className="mt-1 block w-full p-2 border rounded-md"/></div>
          <div><label htmlFor="overrideNotes" className="block text-sm font-medium text-gray-700">Notes (Optional):</label><textarea name="notes" id="overrideNotes" value={currentOverride.notes || ''} onChange={handleOverrideChange} rows={2} className="mt-1 block w-full p-2 border rounded-md"/></div>
        </div>
        footer={
          <><Button variant="outline" onClick={() => setIsOverrideModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveOverride} isLoading={isSubmitting} disabled={isSubmitting}>{editingOverrideId ? 'Save Changes' : 'Add Override'}</Button></>
        }
      </Modal>
    </div>
  );
};

export default DepotOpenManager;
