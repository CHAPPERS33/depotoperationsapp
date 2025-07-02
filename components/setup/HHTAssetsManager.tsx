
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { HHTAsset } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';

const hhtStatuses: HHTAsset['status'][] = ['Active', 'Repair', 'Retired', 'Lost'];

const HHTAssetsManager: React.FC = () => {
  const { hhtAssets, team, addHHTAsset, updateHHTAsset, deleteHHTAsset } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<HHTAsset | null>(null);
  const [currentAsset, setCurrentAsset] = useState<Partial<HHTAsset>>({ status: 'Active' });
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (asset?: HHTAsset) => {
    setFormError(null);
    if (asset) {
      setEditingAsset(asset);
      setCurrentAsset({
        ...asset,
        last_service_date: asset.last_service_date ? asset.last_service_date.split('T')[0] : undefined,
        purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : undefined,
      });
    } else {
      setEditingAsset(null);
      setCurrentAsset({ status: 'Active', purchase_date: TODAY_DATE_STRING });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setCurrentAsset({ status: 'Active' });
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentAsset.serial_number?.trim() || !currentAsset.status) {
      setFormError('Serial Number and Status are required.');
      return;
    }

    const assetToSave: Omit<HHTAsset, 'createdAt' | 'updatedAt'> = {
      serial_number: currentAsset.serial_number.trim(),
      status: currentAsset.status as HHTAsset['status'],
      assigned_to_team_member_id: currentAsset.assigned_to_team_member_id || undefined,
      last_service_date: currentAsset.last_service_date || undefined,
      purchase_date: currentAsset.purchase_date || undefined,
      model_number: currentAsset.model_number || undefined,
      notes: currentAsset.notes || undefined,
    };

    let success;
    if (editingAsset) {
      success = await updateHHTAsset(editingAsset.serial_number, assetToSave);
    } else {
      if (hhtAssets.some(a => a.serial_number === assetToSave.serial_number)) {
        setFormError(`HHT Asset with serial ${assetToSave.serial_number} already exists.`);
        return;
      }
      success = await addHHTAsset(assetToSave);
    }
    if(success){
        handleCloseModal();
    } else {
        setFormError('Failed to save HHT Asset. Please try again.');
    }
  };

  const handleDelete = async (serial_number: string) => {
    if (window.confirm(`Are you sure you want to delete HHT Asset ${serial_number}?`)) {
      const success = await deleteHHTAsset(serial_number);
      if(!success){
        alert('Failed to delete HHT Asset. It might be referenced in other records.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage HHT Assets</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
          Add HHT Asset
        </Button>
      </div>

      {hhtAssets.length === 0 ? (
        <p className="text-gray-500">No HHT assets configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Serial</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Assigned To</th>
                <th className="p-3 text-left font-medium">Last Service</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hhtAssets.sort((a,b) => a.serial_number.localeCompare(b.serial_number)).map(asset => {
                const assignedToMember = team.find(tm => tm.id === asset.assigned_to_team_member_id);
                return (
                  <tr key={asset.serial_number} className="border-b hover:bg-gray-50">
                    <td className="p-3">{asset.serial_number}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        asset.status === 'Active' ? 'bg-green-100 text-green-700' :
                        asset.status === 'Repair' ? 'bg-yellow-100 text-yellow-700' :
                        asset.status === 'Retired' ? 'bg-red-100 text-red-700' : 
                        asset.status === 'Lost' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-3">{assignedToMember?.name || asset.assigned_to_team_member_id || 'N/A'}</td>
                    <td className="p-3">{asset.last_service_date ? new Date(asset.last_service_date + 'T00:00:00Z').toLocaleDateString('en-GB') : 'N/A'}</td>
                    <td className="p-3 space-x-2">
                      <Button onClick={() => handleOpenModal(asset)} variant="ghost" size="sm" aria-label={`Edit asset ${asset.serial_number}`}><Edit size={16} /></Button>
                      <Button onClick={() => handleDelete(asset.serial_number)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Delete asset ${asset.serial_number}`}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingAsset ? 'Edit HHT Asset' : 'Add HHT Asset'} 
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingAsset ? 'Save Changes' : 'Add Asset'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="hht-serial_number" className="block text-sm font-medium text-gray-700">Serial Number</label>
            <input type="text" name="serial_number" id="hht-serial_number" value={currentAsset.serial_number || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" disabled={!!editingAsset} />
          </div>
          <div>
            <label htmlFor="hht-status" className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" id="hht-status" value={currentAsset.status || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              {hhtStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="hht-assigned_to_team_member_id" className="block text-sm font-medium text-gray-700">Assigned To (Team Member - Optional)</label>
            <select name="assigned_to_team_member_id" id="hht-assigned_to_team_member_id" value={currentAsset.assigned_to_team_member_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              <option value="">-- None --</option>
              {team.map(tm => <option key={tm.id} value={tm.id}>{tm.name} ({tm.id})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="hht-last_service_date" className="block text-sm font-medium text-gray-700">Last Service Date (Optional)</label>
            <input type="date" name="last_service_date" id="hht-last_service_date" value={currentAsset.last_service_date || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="hht-purchase_date" className="block text-sm font-medium text-gray-700">Purchase Date (Optional)</label>
            <input type="date" name="purchase_date" id="hht-purchase_date" value={currentAsset.purchase_date || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="hht-model_number" className="block text-sm font-medium text-gray-700">Model Number (Optional)</label>
            <input type="text" name="model_number" id="hht-model_number" value={currentAsset.model_number || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="hht-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea name="notes" id="hht-notes" value={currentAsset.notes || ''} onChange={handleChange} rows={2} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default HHTAssetsManager;