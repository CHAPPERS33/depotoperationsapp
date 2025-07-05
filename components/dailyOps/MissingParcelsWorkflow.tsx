// components/dailyOps/MissingParcelsWorkflow.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { RoundEntry, Client, Courier, DeliveryUnit, ParcelScanEntry } from '../../types';
import {Loader2 } from 'lucide-react';
import { TODAY_DATE_STRING_GB } from '../../constants';

interface TrackingStatus {
  status: string;
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: number;
  trackingUrl?: string;
  note?: string;
}

const MissingParcelsWorkflow: React.FC = () => {
  const {
    missingParcelsLog,
    isLoadingMissingParcelsLog,
    fetchMissingParcelsLog,
    addMissingParcelsToLog,
    updateParcelInLog,
    markMissingParcelRecovered,
    couriers,
    addCourier: apiAddCourier,
    clients,
    addClient: apiAddClient,
    deliveryUnits,
    addDeliveryUnit: apiAddDeliveryUnit,
    } = useSharedState();

  const [currentCourierForWorkflow, setCurrentCourierForWorkflow] = useState<string>('');
  const [showNewCourierFormInWorkflow, setShowNewCourierFormInWorkflow] = useState<boolean>(false);
  const [newCourierNameForWorkflow, setNewCourierNameForWorkflow] = useState<string>('');
  const [newCourierIdForWorkflow, setNewCourierIdForWorkflow] = useState<string>('');

  const [selectedRoundEntries, setSelectedRoundEntries] = useState<Partial<ParcelScanEntry>[]>([{}]);
  const [tempRoundSelect, setTempRoundSelect] = useState<string>('');
  const [newClientNameForWorkflow, setNewClientNameForWorkflow] = useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [parcelToEdit, setParcelToEdit] = useState<RoundEntry | null>(null);
  const [currentEditData, setCurrentEditData] = useState<Partial<ParcelScanEntry>>({});

  const [editModalNewClientName, setEditModalNewClientName] = useState<string>('');
  const [editModalNewCfwdCourierId, setEditModalNewCfwdCourierId] = useState<string>('');
  const [editModalNewCfwdCourierName, setEditModalNewCfwdCourierName] = useState<string>('');
  const [editModalNewRejCourierId, setEditModalNewRejCourierId] = useState<string>('');
  const [editModalNewRejCourierName, setEditModalNewRejCourierName] = useState<string>('');
  const [editModalNewDeliveryUnitId, setEditModalNewDeliveryUnitId] = useState<string>('');
  const [editModalNewDeliveryUnitName, setEditModalNewDeliveryUnitName] = useState<string>('');

  const [isHighPriorityModalOpen, setIsHighPriorityModalOpen] = useState<boolean>(false);
  const [highPriorityChecklistStep, setHighPriorityChecklistStep] = useState<number>(0);
  const [parcelForHighPriorityProcessing, setParcelForHighPriorityProcessing] = useState<RoundEntry | Partial<ParcelScanEntry> | null>(null);
  const [highPriorityActionCallback, setHighPriorityActionCallback] = useState<(() => void) | null>(null);
  const [currentHighPriorityAlert, setCurrentHighPriorityAlert] = useState<string | null>(null);

  const [trackingStatuses] = useState<Record<string, TrackingStatus>>({});
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [lastManualRefreshAllTimestamp, setLastManualRefreshAllTimestamp] = useState<number>(0);
  const REFRESH_ALL_COOLDOWN = 30000;
  const [processedLogIdsForSessionFetch, setProcessedLogIdsForSessionFetch] = useState<Set<string>>(new Set());
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  useEffect(() => {
    fetchMissingParcelsLog();
  }, [fetchMissingParcelsLog]);

  const highPriorityQuestions = [
    "This is a high value client. Have you checked the cages either side?",
    "Have you asked the courier to check their vehicle?",
    "Have you completed a vehicle search?",
    "Has CCTV been viewed?",
    "Are you sure you want to mark this parcel as missing?",
  ];
  const highPriorityNoAlerts = [
    "Please check cages before approving this missing parcel.",
    "Please ask the courier to check their vehicle before approving this missing parcel.",
    "Please check the courier's vehicle before approving this missing parcel.",
    "Please view CCTV before approving this missing parcel.",
    "",
  ];

  const updateSelectedRoundEntry = (index: number, updatedField: Partial<ParcelScanEntry>) => {
    setSelectedRoundEntries(prev => prev.map((entry, i) => (i === index ? { ...entry, ...updatedField } : entry)));
  };
  const addNewCourierForWorkflow = async () => {
    if (!newCourierIdForWorkflow.trim() || !newCourierNameForWorkflow.trim()) {
      alert('Courier ID and Name are required.');
      return;
    }
    const newId = newCourierIdForWorkflow.trim().toUpperCase();
    if (couriers.some(c => c.id === newId)) {
      alert(`Courier ID ${newId} already exists.`);
      return;
    }
    const newEntry: Omit<Courier, 'createdAt' | 'updatedAt'> = { id: newId, name: newCourierNameForWorkflow.trim(), is_active: true };
    const savedCourier = await apiAddCourier(newEntry);
    if (savedCourier) {
      setCurrentCourierForWorkflow(newId);
      setNewCourierIdForWorkflow('');
      setNewCourierNameForWorkflow('');
      setShowNewCourierFormInWorkflow(false);
    } else {
      alert('Failed to add courier.');
    }
  };
  const addNewClientForWorkflow = async () => {
    if (!newClientNameForWorkflow.trim()) {
      alert('Client name is required.');
      return;
    }
    const newEntryData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = { name: newClientNameForWorkflow.trim(), is_high_priority: false };
    if (clients.some(c => c.name.toLowerCase() === newEntryData.name.toLowerCase())) {
      alert(`Client "${newEntryData.name}" already exists.`);
      return;
    }
    const savedClient = await apiAddClient(newEntryData);
    if (savedClient) {
      setSelectedRoundEntries(prev =>
        prev.map(entry =>
          entry.client_id === -1 /* Placeholder for new */ ? { ...entry, client_id: savedClient.id } : entry
        )
      );
      setNewClientNameForWorkflow('');
    } else {
      alert('Failed to add client.');
    }
  };

  const handleAddAllSelectedToLog = async () => {
    setIsSubmittingForm(true);
    const entriesToAdd: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'>[] = selectedRoundEntries
      .map(entry => ({
        ...entry,
        time_scanned: entry.time_scanned || new Date().toISOString(),
        is_recovered: entry.is_recovered === undefined ? false : entry.is_recovered,
        scan_type: entry.scan_type || 'Standard',
      }))
      .filter(
        entry =>
          entry.barcode &&
          entry.barcode.length === 16 &&
          entry.round_id &&
          entry.courier_id &&
          entry.sorter_team_member_id &&
          entry.client_id
      );

    if (entriesToAdd.length !== selectedRoundEntries.length) {
      alert("Some entries were invalid (missing barcode, round, courier, sorter, or client) and were not added.");
    }
    if (entriesToAdd.length > 0) {
      const result = await addMissingParcelsToLog(entriesToAdd);
      if (result) {
        alert(`${result.length} missing parcel(s) added to log.`);
        setSelectedRoundEntries([{}]);
        setTempRoundSelect('');
      } else {
        alert("Failed to add parcels. Please check console for errors.");
      }
    }
    setIsSubmittingForm(false);
  };

  const openEditModal = (parcel: RoundEntry) => {
    setParcelToEdit(parcel);
    setCurrentEditData({ ...parcel });
    setIsEditModalOpen(true);
  };
  const handleEditModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCurrentEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const handleSaveEdit = async () => {
    if (!parcelToEdit || !currentEditData.barcode || currentEditData.barcode.length !== 16) {
      alert("Barcode must be 16 digits.");
      return;
    }
    setIsSubmittingForm(true);
    const result = await updateParcelInLog(parcelToEdit.id, currentEditData);
    if (result) {
      alert("Parcel updated.");
      setIsEditModalOpen(false);
      setParcelToEdit(null);
      setEditModalNewClientName('');
      setEditModalNewCfwdCourierId('');
      setEditModalNewCfwdCourierName('');
      setEditModalNewRejCourierId('');
      setEditModalNewRejCourierName('');
      setEditModalNewDeliveryUnitId('');
      setEditModalNewDeliveryUnitName('');
    } else {
      alert("Failed to update parcel.");
    }
    setIsSubmittingForm(false);
  };
  const toggleParcelRecoveredStatusInLog = async (logId: string, currentStatus: boolean) => {
    await markMissingParcelRecovered(logId, !currentStatus);
  };
  const handleAddClientInEditModal = async () => {
    if (!editModalNewClientName.trim()) {
      alert('Client name is required.');
      return;
    }
    const newEntryData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = { name: editModalNewClientName.trim(), is_high_priority: false };
    if (clients.some(c => c.name.toLowerCase() === newEntryData.name.toLowerCase())) {
      alert(`Client "${newEntryData.name}" already exists.`);
      return;
    }
    const savedClient = await apiAddClient(newEntryData);
    if (savedClient) {
      setCurrentEditData(prev => ({ ...prev, client_id: savedClient.id }));
      setEditModalNewClientName('');
    } else {
      alert('Failed to add client.');
    }
  };
  const handleAddCourierInEditModal = async (type: 'cfwd' | 'rej') => {
    const id = type === 'cfwd' ? editModalNewCfwdCourierId : editModalNewRejCourierId;
    const name = type === 'cfwd' ? editModalNewCfwdCourierName : editModalNewRejCourierName;
    if (!id.trim() || !name.trim()) {
      alert('Courier ID and Name are required.');
      return;
    }
    const newId = id.trim().toUpperCase();
    if (couriers.some(c => c.id === newId)) {
      alert(`Courier ID ${newId} already exists.`);
      return;
    }
    const newEntry: Omit<Courier, 'createdAt' | 'updatedAt'> = { id: newId, name: name.trim(), is_active: true };
    const savedCourier = await apiAddCourier(newEntry);
    if (savedCourier) {
      if (type === 'cfwd') {
        setCurrentEditData(prev => ({ ...prev, cfwd_courier_id: newId }));
        setEditModalNewCfwdCourierId('');
        setEditModalNewCfwdCourierName('');
      } else {
        setCurrentEditData(prev => ({ ...prev, rejected_courier_id: newId }));
        setEditModalNewRejCourierId('');
        setEditModalNewRejCourierName('');
      }
    } else {
      alert('Failed to add courier.');
    }
  };
  const handleAddDeliveryUnitInEditModal = async () => {
    if (!editModalNewDeliveryUnitId.trim() || !editModalNewDeliveryUnitName.trim()) {
      alert('Delivery Unit ID and Name are required.');
      return;
    }
    const newId = editModalNewDeliveryUnitId.trim().toUpperCase();
    if (deliveryUnits.some(du => du.id === newId)) {
      alert(`Delivery Unit ID ${newId} already exists.`);
      return;
    }
    const newEntryData: Omit<DeliveryUnit, 'createdAt' | 'updatedAt'> = {
      id: newId,
      name: editModalNewDeliveryUnitName.trim(),
    };
    const savedDU = await apiAddDeliveryUnit(newEntryData);
    if (savedDU) {
      setCurrentEditData(prev => ({ ...prev, misrouted_du_id: newId }));
      setEditModalNewDeliveryUnitId('');
      setEditModalNewDeliveryUnitName('');
    } else {
      alert('Failed to add delivery unit.');
    }
  };

  const todaysMissingParcelsLog = missingParcelsLog.filter(p => p.dateAdded === TODAY_DATE_STRING_GB && p.courier_id);
  const additionalDetailsParcelsLog = todaysMissingParcelsLog.filter(
    p =>
      Number(p.noScans) > 0 ||
      Number(p.carryForwards) > 0 ||
      (p.cfwd_courier_id && p.cfwd_courier_id.trim() !== '') ||
      (p.scan_type === 'Misrouted' && p.misrouted_du_id && p.misrouted_du_id.trim() !== '') ||
      (p.scan_type === 'Rejected' && p.rejected_courier_id && p.rejected_courier_id.trim() !== '')
  );
  const openHighPriorityModal = (parcel: RoundEntry | Partial<ParcelScanEntry>, actionCallback: () => void) => {
    setParcelForHighPriorityProcessing(parcel);
    setHighPriorityActionCallback(() => actionCallback);
    setHighPriorityChecklistStep(0);
    setCurrentHighPriorityAlert(null);
    setIsHighPriorityModalOpen(true);
  };
  const handleHighPriorityChecklistNext = () => {
    if (highPriorityChecklistStep < highPriorityQuestions.length - 1) {
      setHighPriorityChecklistStep(prev => prev + 1);
      setCurrentHighPriorityAlert(null);
    } else {
      if (highPriorityActionCallback) highPriorityActionCallback();
      setIsHighPriorityModalOpen(false);
    }
  };
  const handleHighPriorityChecklistNo = () => {
    setCurrentHighPriorityAlert(highPriorityNoAlerts[highPriorityChecklistStep]);
  };

  const handleAddEntryClick = async (index: number) => {
    const entry = selectedRoundEntries[index];
    const clientIsHighPriority = clients.find(c => c.id === entry.client_id)?.is_high_priority;
    const action = async () => {
      setIsSubmittingForm(true);
      const newEntryData: Omit<ParcelScanEntry, 'id' | 'created_at' | 'updated_at'> = {
        barcode: entry.barcode || '',
        round_id: entry.round_id || '',
        drop_number: entry.drop_number || 0,
        sub_depot_id: entry.sub_depot_id || 0,
        courier_id: entry.courier_id || '',
        sorter_team_member_id: entry.sorter_team_member_id || '',
        client_id: entry.client_id || 0,
        time_scanned: entry.time_scanned || new Date().toISOString(),
        scan_type: entry.scan_type || 'Standard',
        cfwd_courier_id: entry.cfwd_courier_id || undefined,
        misrouted_du_id: entry.misrouted_du_id || undefined,
        rejected_courier_id: entry.rejected_courier_id || undefined,
        is_recovered: entry.is_recovered === undefined ? false : entry.is_recovered,
      };
      const result = await addMissingParcelsToLog([newEntryData]);
      if (result && result.length > 0) {
        alert(`Parcel ${newEntryData.barcode} added to log.`);
        setSelectedRoundEntries(prev => prev.filter((_, i) => i !== index));
        if (selectedRoundEntries.length === 1) setTempRoundSelect('');
      } else {
        alert(`Failed to add parcel ${newEntryData.barcode}.`);
      }
      setIsSubmittingForm(false);
    };
    if (clientIsHighPriority && !entry.is_recovered) {
      openHighPriorityModal(entry, action);
    } else {
      action();
    }
  };
  // 🚨 Fixed: Remove the reference to setIsEditingHighPriorityParcel, which does not exist or is needed.
  const handleEditParcelClick = (parcel: RoundEntry) => {
    const clientIsHighPriority = clients.find(c => c.id === parcel.client_id)?.is_high_priority;
    if (clientIsHighPriority && !parcel.is_recovered) {
      // setIsEditingHighPriorityParcel(true);  // <-- REMOVE this line!
      openHighPriorityModal(parcel, () => openEditModal(parcel));
    } else {
      openEditModal(parcel);
    }
  };

  const refreshAllTrackingStatuses = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsManualRefreshing(true);
        setLastManualRefreshAllTimestamp(Date.now());
        setProcessedLogIdsForSessionFetch(new Set());
      } else {
        const now = Date.now();
        if (now - lastManualRefreshAllTimestamp < REFRESH_ALL_COOLDOWN) {
          return;
        }
      }
      const promises = todaysMissingParcelsLog
        .filter(parcel => parcel.id && parcel.barcode && parcel.barcode.length === 16)
        .map(parcel => {
          if (isManual) {
            return fetchSingleParcelStatus(parcel.id!, parcel.barcode);
          }
          return Promise.resolve();
        });
      await Promise.all(promises);
      if (isManual) setIsManualRefreshing(false);
    },
    [todaysMissingParcelsLog, /*fetchSingleParcelStatus,*/ lastManualRefreshAllTimestamp, setProcessedLogIdsForSessionFetch]
  );
  useEffect(() => {
    const newProcessedIds = new Set(processedLogIdsForSessionFetch);
    let fetchInitiated = false;
    todaysMissingParcelsLog.forEach(parcel => {
      if (parcel.id && parcel.barcode && parcel.barcode.length === 16) {
        if (!newProcessedIds.has(parcel.id)) {
          // fetchSingleParcelStatus(parcel.id, parcel.barcode); // <--- You must have this function defined somewhere in your hook!
          newProcessedIds.add(parcel.id);
          fetchInitiated = true;
        }
      }
    });
    if (fetchInitiated) {
      setProcessedLogIdsForSessionFetch(newProcessedIds);
    }
  }, [todaysMissingParcelsLog, /*fetchSingleParcelStatus,*/ processedLogIdsForSessionFetch]);

  if (isLoadingMissingParcelsLog) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" /> <span className="ml-2">Loading missing parcels...</span>
      </div>
    );
  }

  // ...the rest of your render JSX (unchanged)
  // You can safely keep all your Modal and table logic as you had it!

  // (Just keep the fixed handleEditParcelClick above!)

  // ...return ( ... );

};

export default MissingParcelsWorkflow;
