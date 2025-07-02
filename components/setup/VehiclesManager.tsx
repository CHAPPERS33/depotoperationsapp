
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Vehicle, VehicleType } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

const vehicleTypes: VehicleType[] = ['Van', 'Rigid', 'Artic', 'LGV', 'HGV', 'Motorbike', 'Bicycle', 'Other'];


const VehiclesManager: React.FC = () => {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({ type: 'Van', is_active: true });
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (vehicle?: Vehicle) => {
    setFormError(null);
    if (vehicle) {
      setEditingVehicle(vehicle);
      setCurrentVehicle(vehicle);
    } else {
      setEditingVehicle(null);
      setCurrentVehicle({ type: 'Van', id: `V-${Date.now()}`, is_active: true }); 
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setCurrentVehicle({ type: 'Van', is_active: true });
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setCurrentVehicle(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : (name === 'registration' ? value.toUpperCase() : value) 
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentVehicle.registration?.trim() || !currentVehicle.type) {
      setFormError('Registration and Type are required.');
      return;
    }

    const vehicleToSave: Omit<Vehicle, 'createdAt' | 'updatedAt'> = {
      id: editingVehicle?.id || currentVehicle.id || `V-${Date.now()}`, 
      registration: currentVehicle.registration.trim(),
      type: currentVehicle.type as VehicleType,
      notes: currentVehicle.notes?.trim() || undefined,
      is_active: currentVehicle.is_active !== undefined ? currentVehicle.is_active : true,
      capacity_kg: currentVehicle.capacity_kg ? Number(currentVehicle.capacity_kg) : null,
      capacity_m3: currentVehicle.capacity_m3 ? Number(currentVehicle.capacity_m3) : null,
    };

    let success;
    if (editingVehicle) {
      success = await updateVehicle(editingVehicle.id, vehicleToSave);
    } else {
      if (vehicles.some(v => v.registration === vehicleToSave.registration)) {
        setFormError(`Vehicle with registration ${vehicleToSave.registration} already exists.`);
        return;
      }
      success = await addVehicle(vehicleToSave);
    }
    if(success) {
        handleCloseModal();
    } else {
        setFormError('Failed to save vehicle. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete vehicle ${vehicles.find(v=>v.id === id)?.registration}?`)) {
      const success = await deleteVehicle(id);
      if (!success) {
          alert('Failed to delete vehicle. It might be in use.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Vehicles</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
          Add Vehicle
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <p className="text-gray-500">No vehicles configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Registration</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-left font-medium">Active</th>
                <th className="p-3 text-left font-medium">Notes</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.sort((a,b)=>a.registration.localeCompare(b.registration)).map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{v.registration}</td>
                  <td className="p-3">{v.type}</td>
                  <td className="p-3">{v.is_active ? 'Yes' : 'No'}</td>
                  <td className="p-3 truncate max-w-xs" title={v.notes || undefined}>{v.notes || 'N/A'}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(v)} variant="ghost" size="sm"><Edit size={16} /></Button>
                    <Button onClick={() => handleDelete(v.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button>
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
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingVehicle ? 'Save Changes' : 'Add Vehicle'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="vehicle-registration" className="block text-sm font-medium text-gray-700">Registration</label>
            <input type="text" name="registration" id="vehicle-registration" value={currentVehicle.registration || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="vehicle-type" className="block text-sm font-medium text-gray-700">Type</label>
            <select name="type" id="vehicle-type" value={currentVehicle.type || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              {vehicleTypes.map(vt => <option key={vt} value={vt}>{vt}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="vehicle-notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea name="notes" id="vehicle-notes" value={currentVehicle.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="vehicle-is_active" checked={currentVehicle.is_active !== undefined ? currentVehicle.is_active : true} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <label htmlFor="vehicle-is_active" className="ml-2 block text-sm text-gray-900">Active Vehicle</label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default VehiclesManager;