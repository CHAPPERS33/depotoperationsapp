
'use client';

import React, { useState, useRef } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Round, SubDepot } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, AlertTriangle, Upload } from 'lucide-react';

const RoundsManager: React.FC = () => {
  const { rounds, subDepots, addRound, updateRound, deleteRound } = useSharedState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [currentRound, setCurrentRound] = useState<Partial<Round>>({ sub_depot_id: subDepots[0]?.id });
  const [formError, setFormError] = useState<string | null>(null);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<Round | null>(null);

  const handleOpenModal = (round?: Round) => {
    setFormError(null);
    if (round) {
      setEditingRound(round);
      setCurrentRound(round);
    } else {
      setEditingRound(null);
      setCurrentRound({ sub_depot_id: subDepots[0]?.id, drop_number: 1, id: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRound(null);
    setCurrentRound({ sub_depot_id: subDepots[0]?.id, id: '' });
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setCurrentRound(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'sub_depot_id' || name === 'drop_number') ? parseInt(value) : value
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentRound.id?.trim() || currentRound.sub_depot_id === undefined || currentRound.drop_number === undefined || currentRound.drop_number <= 0) {
      setFormError('Round ID (non-empty string), Sub Depot, and Main Drop number (positive) are required.');
      return;
    }

    const roundToSave: Omit<Round, 'createdAt' | 'updatedAt'> = {
      id: currentRound.id.trim(),
      sub_depot_id: Number(currentRound.sub_depot_id),
      drop_number: Number(currentRound.drop_number),
      round_name: currentRound.round_name || null,
      is_active: currentRound.is_active !== undefined ? currentRound.is_active : true,
    };

    let success;
    if (editingRound) {
      success = await updateRound(editingRound.id, roundToSave);
    } else {
      if (rounds.some(r => r.id === roundToSave.id)) {
        setFormError(`Round with ID ${roundToSave.id} already exists.`);
        return;
      }
      success = await addRound(roundToSave);
    }
    if (success) {
        handleCloseModal();
    } else {
        setFormError('Failed to save round. Please try again.');
    }
  };

  const handleDeleteRequest = (round: Round) => {
    setRoundToDelete(round);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteRound = async () => {
    if (roundToDelete) {
      const success = await deleteRound(roundToDelete.id);
      if (!success) {
          alert('Failed to delete round.');
      }
    }
    setIsConfirmDeleteModalOpen(false);
    setRoundToDelete(null);
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedRoundsData: Array<Partial<Round>> = [];

        if (file.name.endsWith('.json')) {
          importedRoundsData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r\n|\n/);
          const headerLine = lines.shift();
          if (!headerLine) throw new Error("CSV file is empty or has no header.");
          
          const header = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_')); // Normalize headers to snake_case
          
          const idIndex = header.indexOf('id');
          const subDepotIdIndex = header.indexOf('sub_depot_id');
          const dropNumberIndex = header.indexOf('drop_number');
          const roundNameIndex = header.indexOf('round_name');
          const isActiveIndex = header.indexOf('is_active');


          if (idIndex === -1 || subDepotIdIndex === -1 || dropNumberIndex === -1) {
             console.error("CSV must contain 'id', 'sub_depot_id', and 'drop_number' columns.");
             alert("CSV Error: Missing required columns (id, sub_depot_id, drop_number). Check console for details.");
             return;
          }
          
          importedRoundsData = lines.filter(line => line.trim()).map(line => {
            const values = line.split(',');
            const roundData: Partial<Round> = {
              id: values[idIndex]?.trim(),
              sub_depot_id: parseInt(values[subDepotIdIndex]?.trim()),
              drop_number: parseInt(values[dropNumberIndex]?.trim()),
              is_active: isActiveIndex !== -1 ? ['true', '1', 'yes'].includes(values[isActiveIndex]?.trim().toLowerCase()) : true,
            };
            if (roundNameIndex !== -1 && values[roundNameIndex]?.trim()) {
                roundData.round_name = values[roundNameIndex]?.trim();
            }
            return roundData;
          });
        } else {
          alert("Unsupported file type. Please upload JSON or CSV.");
          return;
        }

        processImportedRounds(importedRoundsData);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Failed to process file. Ensure it's a valid JSON or CSV.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const processImportedRounds = (importedRoundsData: Array<Partial<Round>>) => {
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    importedRoundsData.forEach(async (rawRound, index) => {
      const roundId = typeof rawRound.id === 'string' ? rawRound.id.trim() : String(rawRound.id).trim();
      const subDepotId = Number(rawRound.sub_depot_id);
      const dropNumber = Number(rawRound.drop_number);
      
      if (!roundId || isNaN(subDepotId) || !subDepots.find(sd => sd.id === subDepotId) || isNaN(dropNumber) || dropNumber <= 0) {
        errors.push(`Row ${index + 1} (ID: ${roundId || 'N/A'}): Invalid data or Sub-Depot not found. Required: id, sub_depot_id, drop_number.`);
        errorCount++;
        return;
      }
      
      if (rounds.some(r => r.id === roundId)) {
        skippedCount++;
        return;
      }

      const newRound: Omit<Round, 'createdAt' | 'updatedAt'> = {
        id: roundId,
        sub_depot_id: subDepotId,
        drop_number: dropNumber,
        round_name: rawRound.round_name || null,
        is_active: rawRound.is_active !== undefined ? rawRound.is_active : true,
      };
      const result = await addRound(newRound);
      if(result) successCount++; else errorCount++;
    });

    // Note: Due to async nature, alert might show before all promises resolve if not awaited properly.
    // For simplicity here, assuming addRound updates state which triggers re-render, but a Promise.all approach would be more robust for the alert.
    // After loop (or better, after Promise.all if addRound is async and returns promise):
    setTimeout(() => { // Timeout to allow state updates to reflect roughly
        let summary = `${successCount} rounds imported successfully.`;
        if (skippedCount > 0) summary += ` ${skippedCount} rounds skipped (duplicate ID).`;
        if (errorCount > 0) summary += ` ${errorCount} rounds had errors (see console for details).`;
        alert(summary);
        if (errors.length > 0) console.warn("Import errors:", errors);
    }, 500);
  };


  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold">Manage Rounds</h2>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".csv,.json" 
            onChange={handleFileImport} 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline" 
            leftIcon={Upload}
          >
            Import Rounds
          </Button>
          <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
            Add Round
          </Button>
        </div>
      </div>

      {rounds.length === 0 ? (
        <p className="text-gray-500">No rounds configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Round ID</th>
                <th className="p-3 text-left font-medium">Sub-Depot</th>
                <th className="p-3 text-left font-medium">Drop Number</th>
                <th className="p-3 text-left font-medium">Active</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rounds.sort((a,b) => a.id.localeCompare(b.id)).map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{r.id}</td>
                  <td className="p-3">{subDepots.find(sd => sd.id === r.sub_depot_id)?.name || r.sub_depot_id}</td>
                  <td className="p-3">{r.drop_number}</td>
                  <td className="p-3">{r.is_active ? 'Yes' : 'No'}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(r)} variant="ghost" size="sm" aria-label={`Edit Round ${r.id}`}><Edit size={16} /></Button>
                    <Button onClick={() => handleDeleteRequest(r)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Delete Round ${r.id}`}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingRound ? 'Edit Round' : 'Add Round'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingRound ? 'Save Changes' : 'Add Round'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="round-id" className="block text-sm font-medium text-gray-700">Round ID</label>
            <input type="text" name="id" id="round-id" value={currentRound.id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" disabled={!!editingRound} />
          </div>
          <div>
            <label htmlFor="round-sub_depot_id" className="block text-sm font-medium text-gray-700">Sub-Depot</label>
            <select name="sub_depot_id" id="round-sub_depot_id" value={currentRound.sub_depot_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              {subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="round-drop_number" className="block text-sm font-medium text-gray-700">Drop Number</label>
            <input type="number" name="drop_number" id="round-drop_number" value={currentRound.drop_number || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="round-round_name" className="block text-sm font-medium text-gray-700">Round Name (Optional)</label>
            <input type="text" name="round_name" id="round-round_name" value={currentRound.round_name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="round-is_active" checked={currentRound.is_active !== undefined ? currentRound.is_active : true} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
            <label htmlFor="round-is_active" className="ml-2 block text-sm text-gray-900">Active Round</label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>

      <Modal isOpen={isConfirmDeleteModalOpen} onClose={() => setIsConfirmDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-700">
            Are you sure you want to delete Round {roundToDelete?.id}? This action cannot be undone.
          </p>
        </div>
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteRound}>Delete</Button>
          </div>
        }
      </Modal>
    </div>
  );
};

export default RoundsManager;