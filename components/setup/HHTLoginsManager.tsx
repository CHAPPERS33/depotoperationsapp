
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { HHTLogin } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

const HHTLoginsManager: React.FC = () => {
  const { hhtLogins, subDepots, addHHTLogin, updateHHTLogin, deleteHHTLogin } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<HHTLogin | null>(null);
  const [currentLogin, setCurrentLogin] = useState<Partial<Omit<HHTLogin, 'pin_hash'>> & {pin?: string}>({ sub_depot_id: subDepots[0]?.id, is_active: true });
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (login?: HHTLogin) => {
    setFormError(null);
    if (login) {
      setEditingLogin(login);
      setCurrentLogin({...login, pin: ''}); // Don't prefill PIN for edit, expect new PIN if change needed
    } else {
      setEditingLogin(null);
      setCurrentLogin({ sub_depot_id: subDepots[0]?.id, is_active: true, pin: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLogin(null);
    setCurrentLogin({ sub_depot_id: subDepots[0]?.id, is_active: true, pin: '' });
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setCurrentLogin(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (name === 'sub_depot_id' ? parseInt(value) : value)
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentLogin.login_id?.trim() || (!editingLogin && !currentLogin.pin?.trim()) || currentLogin.sub_depot_id === undefined) {
      setFormError('Login ID, PIN (for new), and Sub Depot are required.');
      return;
    }
    if (currentLogin.pin && currentLogin.pin.length < 4) {
        setFormError('PIN must be at least 4 characters long.');
        return;
    }

    const loginDataPayload: Partial<Omit<HHTLogin, 'pin_hash'| 'createdAt' | 'updatedAt'>> & {pin?: string} = {
      login_id: currentLogin.login_id.trim(),
      sub_depot_id: Number(currentLogin.sub_depot_id),
      notes: currentLogin.notes?.trim() || undefined,
      is_active: currentLogin.is_active !== undefined ? currentLogin.is_active : true,
    };
    if (currentLogin.pin?.trim()) { // Only include PIN if provided (for new or if changing)
        loginDataPayload.pin = currentLogin.pin.trim();
    }


    let success;
    if (editingLogin) {
      success = await updateHHTLogin(editingLogin.login_id, loginDataPayload);
    } else {
      if (hhtLogins.some(l => l.login_id === loginDataPayload.login_id)) {
        setFormError(`HHT Login with ID ${loginDataPayload.login_id} already exists.`);
        return;
      }
      if(!loginDataPayload.pin) { // PIN is required for new
          setFormError('PIN is required for a new HHT Login.');
          return;
      }
      success = await addHHTLogin(loginDataPayload as Omit<HHTLogin, 'createdAt' | 'updatedAt' | 'pin_hash'> & {pin: string});
    }
    if(success){
        handleCloseModal();
    } else {
        setFormError('Failed to save HHT Login. Please try again.');
    }
  };

  const handleDelete = async (loginId: string) => {
    if (window.confirm(`Are you sure you want to delete HHT Login ${loginId}?`)) {
      const success = await deleteHHTLogin(loginId);
      if(!success){
          alert('Failed to delete HHT login. It might be referenced by scan logs.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage HHT Logins</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
          Add HHT Login
        </Button>
      </div>

      {hhtLogins.length === 0 ? (
        <p className="text-gray-500">No HHT logins configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Login ID</th>
                <th className="p-3 text-left font-medium">Sub-Depot</th>
                <th className="p-3 text-left font-medium">Notes</th>
                <th className="p-3 text-left font-medium">Active</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hhtLogins.sort((a,b)=>a.login_id.localeCompare(b.login_id)).map(login => (
                <tr key={login.login_id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{login.login_id}</td>
                  <td className="p-3">{subDepots.find(sd => sd.id === login.sub_depot_id)?.name || login.sub_depot_id}</td>
                  <td className="p-3 truncate max-w-xs" title={login.notes || undefined}>{login.notes || 'N/A'}</td>
                  <td className="p-3">{login.is_active ? 'Yes' : 'No'}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(login)} variant="ghost" size="sm"><Edit size={16} /></Button>
                    <Button onClick={() => handleDelete(login.login_id)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button>
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
        title={editingLogin ? 'Edit HHT Login' : 'Add HHT Login'} 
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingLogin ? 'Save Changes' : 'Add Login'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="hht-login_id" className="block text-sm font-medium text-gray-700">Login ID</label>
            <input type="text" name="login_id" id="hht-login_id" value={currentLogin.login_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" disabled={!!editingLogin} />
          </div>
          <div>
            <label htmlFor="hht-pin" className="block text-sm font-medium text-gray-700">PIN {editingLogin && "(Leave blank to keep current)"}</label>
            <input type="password" name="pin" id="hht-pin" value={currentLogin.pin || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" placeholder={editingLogin ? "Enter new PIN to change" : ""} />
          </div>
          <div>
            <label htmlFor="hht-sub_depot_id" className="block text-sm font-medium text-gray-700">Sub-Depot</label>
            <select name="sub_depot_id" id="hht-sub_depot_id" value={currentLogin.sub_depot_id || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
              {subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="hht-notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea name="notes" id="hht-notes" value={currentLogin.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="hht-is_active" checked={currentLogin.is_active !== undefined ? currentLogin.is_active : true} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <label htmlFor="hht-is_active" className="ml-2 block text-sm text-gray-900">Active Login</label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default HHTLoginsManager;