
'use client';

import React, { useState, useRef } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Courier } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, Upload, Phone } from 'lucide-react';

const CouriersManager: React.FC = () => {
  const { couriers, team, addCourier, updateCourier, deleteCourier } = useSharedState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [currentCourier, setCurrentCourier] = useState<Partial<Courier>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (courier?: Courier) => {
    setFormError(null);
    if (courier) {
      setEditingCourier(courier);
      setCurrentCourier(courier);
    } else {
      setEditingCourier(null);
      setCurrentCourier({is_active: true}); // Default is_active to true
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourier(null);
    setCurrentCourier({});
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCurrentCourier(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : (name === 'id' ? value.toUpperCase() : value) 
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentCourier.id?.trim() || !currentCourier.name?.trim()) {
      setFormError('Courier ID and Name are required.');
      return;
    }
    if (currentCourier.telephone && !/^\+?[0-9\s-()]{7,20}$/.test(currentCourier.telephone)) {
      setFormError('Please enter a valid telephone number.');
      return;
    }

    const courierToSave: Omit<Courier, 'createdAt' | 'updatedAt'> = {
      id: currentCourier.id.trim(),
      name: currentCourier.name.trim(),
      is_driver_for_team_member_id: currentCourier.is_driver_for_team_member_id || undefined,
      notes: currentCourier.notes?.trim() || undefined,
      telephone: currentCourier.telephone?.trim() || undefined,
      is_active: currentCourier.is_active !== undefined ? currentCourier.is_active : true,
    };

    let success;
    if (editingCourier) {
      success = await updateCourier(editingCourier.id, courierToSave);
    } else {
      if (couriers.some(c => c.id === courierToSave.id)) {
        setFormError(`Courier with ID ${courierToSave.id} already exists.`);
        return;
      }
      success = await addCourier(courierToSave);
    }

    if(success) {
        handleCloseModal();
    } else {
        setFormError('Failed to save courier. Please check data or API logs.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete Courier ${id}?`)) {
      const success = await deleteCourier(id);
      if(!success) {
        alert('Failed to delete courier. It might be referenced elsewhere.');
      }
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedCouriersData: Partial<Courier>[] = [];

        if (file.name.endsWith('.json')) {
          importedCouriersData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error("CSV file must have a header and at least one data row.");
          
          const headerLine = lines.shift()!;
          const header = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
          
          const idIndex = header.indexOf('id');
          const nameIndex = header.indexOf('name');
          const driverForIndex = header.indexOf('is_driver_for_team_member_id');
          const notesIndex = header.indexOf('notes');
          const telephoneIndex = header.indexOf('telephone');
          const isActiveIndex = header.indexOf('is_active');


          if (idIndex === -1 || nameIndex === -1) {
             console.error("CSV must contain 'id' and 'name' columns.");
             alert("CSV Error: Missing required columns (id, name). Check console for details.");
             return;
          }
          
          importedCouriersData = lines.map(line => {
            const values = line.split(',');
            const courier: Partial<Courier> = {
              id: values[idIndex]?.trim().toUpperCase(),
              name: values[nameIndex]?.trim(),
              is_active: isActiveIndex !== -1 ? ['true','1','yes'].includes(values[isActiveIndex]?.trim().toLowerCase()) : true,
            };
            if (driverForIndex !== -1 && values[driverForIndex]?.trim()) {
              courier.is_driver_for_team_member_id = values[driverForIndex]?.trim();
            }
            if (notesIndex !== -1 && values[notesIndex]?.trim()) {
              courier.notes = values[notesIndex]?.trim();
            }
            if (telephoneIndex !== -1 && values[telephoneIndex]?.trim()) {
              courier.telephone = values[telephoneIndex]?.trim();
            }
            return courier;
          });
        } else {
          alert("Unsupported file type. Please upload JSON or CSV.");
          return;
        }
        processImportedCouriers(importedCouriersData);
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Failed to process file. Error: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const processImportedCouriers = (importedData: Partial<Courier>[]) => {
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    importedData.forEach(async (courier, index) => {
      if (!courier.id || !courier.name) {
        errors.push(`Row ${index + 1}: Missing ID or Name.`);
        errorCount++;
        return;
      }
      if (couriers.some(c => c.id === courier.id)) {
        skippedCount++;
        return;
      }
      const result = await addCourier(courier as Omit<Courier, 'createdAt' | 'updatedAt'>); 
      if(result) successCount++; else errorCount++;
    });

    setTimeout(() => {
        let summary = `${successCount} couriers imported.`;
        if (skippedCount > 0) summary += ` ${skippedCount} skipped (duplicate ID).`;
        if (errorCount > 0) summary += ` ${errorCount} had errors.`;
        alert(summary);
        if (errors.length > 0) console.warn("Import errors (Couriers):", errors);
    }, 500);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold">Manage Couriers</h2>
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
            Import Couriers
          </Button>
          <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
            Add Courier
          </Button>
        </div>
      </div>

      {couriers.length === 0 ? (
        <p className="text-gray-500">No couriers configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Telephone</th>
                <th className="p-3 text-left font-medium">Is Driver For</th>
                <th className="p-3 text-left font-medium">Notes</th>
                <th className="p-3 text-left font-medium">Active</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {couriers.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.id}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.telephone || 'N/A'}</td>
                  <td className="p-3">{c.is_driver_for_team_member_id ? (team.find(tm => tm.id === c.is_driver_for_team_member_id)?.name || c.is_driver_for_team_member_id) : 'N/A'}</td>
                  <td className="p-3 truncate max-w-xs" title={c.notes || undefined}>{c.notes || 'N/A'}</td>
                  <td className="p-3">{c.is_active ? 'Yes' : 'No'}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(c)} variant="ghost" size="sm"><Edit size={16} /></Button>
                    <Button onClick={() => handleDelete(c.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button>
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
        title={editingCourier ? 'Edit Courier' : 'Add Courier'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingCourier ? 'Save Changes' : 'Add Courier'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="courier-id" className="block text-sm font-medium text-gray-700">Courier ID</label>
            <input type="text" name="id" id="courier-id" value={currentCourier.id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" disabled={!!editingCourier} />
          </div>
          <div>
            <label htmlFor="courier-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="courier-name" value={currentCourier.name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="courier-telephone" className="block text-sm font-medium text-gray-700">Telephone (Optional)</label>
            <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                    type="tel" 
                    name="telephone" 
                    id="courier-telephone" 
                    value={currentCourier.telephone || ''} 
                    onChange={handleChange} 
                    className="block w-full p-2 pl-10 border rounded-md" 
                    placeholder="e.g. 07123456789"
                />
            </div>
          </div>
          <div>
            <label htmlFor="courier-is_driver_for_team_member_id" className="block text-sm font-medium text-gray-700">Is Driver For (Team Member ID - Optional)</label>
            <select name="is_driver_for_team_member_id" id="courier-is_driver_for_team_member_id" value={currentCourier.is_driver_for_team_member_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              <option value="">-- None --</option>
              {team.filter(tm => tm.position === 'DUC' || tm.position === 'Marshall').map(tm => <option key={tm.id} value={tm.id}>{tm.name} ({tm.id})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="courier-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea name="notes" id="courier-notes" value={currentCourier.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="courier-is_active" checked={currentCourier.is_active !== undefined ? currentCourier.is_active : true} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <label htmlFor="courier-is_active" className="ml-2 block text-sm text-gray-900">Active Courier</label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default CouriersManager;