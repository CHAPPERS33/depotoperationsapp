
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { DeliveryUnit } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

const DeliveryUnitsManager: React.FC = () => {
  const { deliveryUnits, addDeliveryUnit, updateDeliveryUnit, deleteDeliveryUnit } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDU, setEditingDU] = useState<DeliveryUnit | null>(null);
  const [currentDU, setCurrentDU] = useState<Partial<DeliveryUnit>>({ id: '', name: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (du?: DeliveryUnit) => {
    setFormError(null);
    if (du) {
      setEditingDU(du);
      setCurrentDU(du);
    } else {
      setEditingDU(null);
      setCurrentDU({ id: '', name: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDU(null);
    setCurrentDU({ id: '', name: '' });
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDU(prev => ({ ...prev, [name]: name === 'id' ? value.toUpperCase() : value }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentDU.id?.trim() || !currentDU.name?.trim()) {
      setFormError('Both ID and Name are required.');
      return;
    }

    const duToSave: Omit<DeliveryUnit, 'createdAt' | 'updatedAt'> = { // For add, ID is part of this
        id: currentDU.id.trim(),
        name: currentDU.name.trim(),
        address: currentDU.address || null,
        contact_email: currentDU.contact_email || null,
    };

    let success;
    if (editingDU) {
      success = await updateDeliveryUnit(editingDU.id, duToSave);
    } else {
      if (deliveryUnits.some(du => du.id === duToSave.id)) {
        setFormError(`Delivery Unit with ID ${duToSave.id} already exists.`);
        return;
      }
      success = await addDeliveryUnit(duToSave);
    }
    if(success){
        handleCloseModal();
    } else {
        setFormError('Failed to save delivery unit. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete Delivery Unit ${id}? This may affect associated Sub Depots.`)) {
      const success = await deleteDeliveryUnit(id);
      if(!success){
        alert('Failed to delete Delivery Unit. It might be in use.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Delivery Units</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
          Add Delivery Unit
        </Button>
      </div>

      {deliveryUnits.length === 0 ? (
        <p className="text-gray-500">No delivery units configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryUnits.sort((a,b) => a.id.localeCompare(b.id)).map(du => (
                <tr key={du.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{du.id}</td>
                  <td className="p-3">{du.name}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(du)} variant="ghost" size="sm" aria-label={`Edit ${du.name}`}>
                      <Edit size={16} />
                    </Button>
                    <Button onClick={() => handleDelete(du.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Delete ${du.name}`}>
                      <Trash2 size={16} />
                    </Button>
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
        title={editingDU ? 'Edit Delivery Unit' : 'Add Delivery Unit'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingDU ? 'Save Changes' : 'Add Unit'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="du-id" className="block text-sm font-medium text-gray-700">Delivery Unit ID (e.g., EDM)</label>
            <input
              type="text"
              name="id"
              id="du-id"
              value={currentDU.id || ''}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!!editingDU}
            />
          </div>
          <div>
            <label htmlFor="du-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              id="du-name"
              value={currentDU.name || ''}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
           <div>
            <label htmlFor="du-address" className="block text-sm font-medium text-gray-700">Address (Optional)</label>
            <input type="text" name="address" id="du-address" value={currentDU.address || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md"/>
          </div>
          <div>
            <label htmlFor="du-contact_email" className="block text-sm font-medium text-gray-700">Contact Email (Optional)</label>
            <input type="email" name="contact_email" id="du-contact_email" value={currentDU.contact_email || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md"/>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default DeliveryUnitsManager;