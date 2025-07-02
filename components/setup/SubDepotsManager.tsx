
'use client';

import React, { useState, useRef } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { SubDepot, DeliveryUnit } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';

const SubDepotsManager: React.FC = () => {
  const { subDepots, deliveryUnits, addSubDepot, updateSubDepot, deleteSubDepot } = useSharedState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubDepot, setEditingSubDepot] = useState<SubDepot | null>(null);
  const [currentSubDepot, setCurrentSubDepot] = useState<Partial<SubDepot>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (sd?: SubDepot) => {
    setFormError(null);
    if (sd) {
      setEditingSubDepot(sd);
      setCurrentSubDepot(sd);
    } else {
      setEditingSubDepot(null);
      setCurrentSubDepot({delivery_unit_id: deliveryUnits[0]?.id || ''});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubDepot(null);
    setCurrentSubDepot({});
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentSubDepot(prev => ({ 
      ...prev, 
      [name]: name === 'id' ? (value ? parseInt(value) : undefined) : value 
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (currentSubDepot.id === undefined || !currentSubDepot.name?.trim() || !currentSubDepot.delivery_unit_id) {
      setFormError('Sub Depot ID, Name, and Delivery Unit ID are required.');
      return;
    }
    
    const subDepotToSave: Omit<SubDepot, 'createdAt' | 'updatedAt'> = { // ID is part of Omit
      id: Number(currentSubDepot.id),
      name: currentSubDepot.name.trim(),
      delivery_unit_id: currentSubDepot.delivery_unit_id,
      location_description: currentSubDepot.location_description || undefined
    };

    let success;
    if (editingSubDepot) {
      success = await updateSubDepot(editingSubDepot.id, subDepotToSave);
    } else {
      if (subDepots.some(sd => sd.id === subDepotToSave.id)) {
        setFormError(`Sub Depot with ID ${subDepotToSave.id} already exists.`);
        return;
      }
      success = await addSubDepot(subDepotToSave);
    }
    if(success){
        handleCloseModal();
    } else {
        setFormError('Failed to save Sub Depot. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(`Are you sure you want to delete Sub Depot ${id}?`)) {
      const success = await deleteSubDepot(id);
      if(!success){
        alert('Failed to delete Sub Depot. It might be in use.');
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
        let importedData: Partial<SubDepot>[] = [];

        if (file.name.endsWith('.json')) {
          importedData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error("CSV file must have a header and at least one data row.");
          
          const headerLine = lines.shift()!;
          const header = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
          
          const idIndex = header.indexOf('id');
          const nameIndex = header.indexOf('name');
          const deliveryUnitIdIndex = header.indexOf('delivery_unit_id');
          const locationDescIndex = header.indexOf('location_description');


          if (idIndex === -1 || nameIndex === -1 || deliveryUnitIdIndex === -1) {
             console.error("CSV must contain 'id', 'name', and 'delivery_unit_id' columns.");
             alert("CSV Error: Missing required columns (id, name, delivery_unit_id).");
             return;
          }
          
          importedData = lines.map(line => {
            const values = line.split(',');
            const subDepot: Partial<SubDepot> = {
              id: parseInt(values[idIndex]?.trim()),
              name: values[nameIndex]?.trim(),
              delivery_unit_id: values[deliveryUnitIdIndex]?.trim().toUpperCase(),
            };
            if (locationDescIndex !== -1 && values[locationDescIndex]?.trim()) {
                subDepot.location_description = values[locationDescIndex]?.trim();
            }
            return subDepot;
          });
        } else {
          alert("Unsupported file type. Please upload JSON or CSV.");
          return;
        }
        processImportedSubDepots(importedData);
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

  const processImportedSubDepots = (importedData: Partial<SubDepot>[]) => {
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    importedData.forEach(async (sd, index) => {
      if (sd.id === undefined || isNaN(Number(sd.id)) || !sd.name || !sd.name.trim() || !sd.delivery_unit_id) {
        errors.push(`Row ${index + 1}: Missing or invalid ID/Name/Delivery Unit ID.`);
        errorCount++;
        return;
      }
      if (!deliveryUnits.find(du => du.id === sd.delivery_unit_id)) {
        errors.push(`Row ${index + 1} (ID: ${sd.id}): Delivery Unit ID '${sd.delivery_unit_id}' not found.`);
        errorCount++;
        return;
      }
      
      const existingSubDepot = subDepots.find(s => s.id === Number(sd.id));
      const subDepotToSave: Omit<SubDepot, 'createdAt' | 'updatedAt'> = {
        id: Number(sd.id),
        name: sd.name.trim(),
        delivery_unit_id: sd.delivery_unit_id,
        location_description: sd.location_description || undefined,
      };

      let result;
      if (existingSubDepot) {
        result = await updateSubDepot(existingSubDepot.id, subDepotToSave);
        if (result) updatedCount++; else errorCount++;
      } else {
        result = await addSubDepot(subDepotToSave);
        if (result) addedCount++; else errorCount++;
      }
    });

    setTimeout(() => {
        let summary = `${addedCount} sub depots added, ${updatedCount} updated.`;
        if (errorCount > 0) summary += ` ${errorCount} had errors.`;
        alert(summary);
        if (errors.length > 0) console.warn("Import errors (Sub Depots):", errors);
    }, 500);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold">Manage Sub Depots</h2>
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
            Import Sub Depots
          </Button>
          <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
            Add Sub Depot
          </Button>
        </div>
      </div>

      {subDepots.length === 0 ? (
        <p className="text-gray-500">No sub depots configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Delivery Unit</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subDepots.sort((a,b) => a.id - b.id).map(sd => (
                <tr key={sd.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{sd.id}</td>
                  <td className="p-3">{sd.name}</td>
                  <td className="p-3">{deliveryUnits.find(du => du.id === sd.delivery_unit_id)?.name || sd.delivery_unit_id}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(sd)} variant="ghost" size="sm"><Edit size={16} /></Button>
                    <Button onClick={() => handleDelete(sd.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button>
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
        title={editingSubDepot ? 'Edit Sub Depot' : 'Add Sub Depot'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingSubDepot ? 'Save Changes' : 'Add Sub Depot'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="subDepot-id" className="block text-sm font-medium text-gray-700">Sub Depot ID (Number)</label>
            <input type="number" name="id" id="subDepot-id" value={currentSubDepot.id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" disabled={!!editingSubDepot} />
          </div>
          <div>
            <label htmlFor="subDepot-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="subDepot-name" value={currentSubDepot.name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="subDepot-delivery_unit_id" className="block text-sm font-medium text-gray-700">Delivery Unit</label>
            <select name="delivery_unit_id" id="subDepot-delivery_unit_id" value={currentSubDepot.delivery_unit_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
                <option value="">-- Select Delivery Unit --</option>
                {deliveryUnits.map(du => <option key={du.id} value={du.id}>{du.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="subDepot-location_description" className="block text-sm font-medium text-gray-700">Location Description (Optional)</label>
            <input type="text" name="location_description" id="subDepot-location_description" value={currentSubDepot.location_description || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default SubDepotsManager;