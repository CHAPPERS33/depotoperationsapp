'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { TeamMember, Position, DeliveryUnit, SubDepot } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';

const TeamManager: React.FC = () => {
  const { team, fetchTeam, saveTeamMember, deleteTeamMember, deliveryUnits, subDepots, isLoadingTeam } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [currentMember, setCurrentMember] = useState<Partial<TeamMember>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam(); 
  }, [fetchTeam]);

  const handleOpenModal = (member?: TeamMember) => {
    setFormError(null);
    if (member) {
      setEditingMember(member);
      setCurrentMember(member);
    } else {
      setEditingMember(null);
      // Provide default values for a new member form matching TeamMember structure
      setCurrentMember({ 
        name: '',
        position: 'Sorter', 
        email: '',
        phone_number: '',
        delivery_unit_id: deliveryUnits[0]?.id || undefined,
        sub_depot_id: subDepots[0]?.id || undefined,
        is_driver_for_team_member_id: undefined,
        hourly_rate: 12.50,
        is_active: true,
      }); 
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setCurrentMember({});
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: string | number | boolean | undefined | null = value;

    if (type === 'checkbox') {
        processedValue = checked;
    } else if (name === 'sub_depot_id' || name === 'hourly_rate') {
        processedValue = value ? Number(value) : null; // Allow clearing to null
    } else if (name === 'delivery_unit_id' || name === 'is_driver_for_team_member_id') {
        processedValue = value || null; // Allow clearing to null for optional FKs
    }
    
    setCurrentMember(prev => ({ ...prev, [name]: processedValue }));
  };
  

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentMember.name?.trim() || !currentMember.position) {
      setFormError('Name and Position are required.');
      return;
    }

    // Ensure all required fields are present or have defaults from TeamMember type
    const memberToSave: Partial<TeamMember> = { // Use Partial as ID is handled by saveTeamMember
        id: editingMember?.id, // ID will be handled by saveTeamMember for new/edit
        name: currentMember.name.trim(),
        position: currentMember.position,
        email: currentMember.email?.trim() || null,
        phone_number: currentMember.phone_number?.trim() || null,
        delivery_unit_id: currentMember.delivery_unit_id || null,
        sub_depot_id: currentMember.sub_depot_id ? Number(currentMember.sub_depot_id) : null,
        is_driver_for_team_member_id: currentMember.is_driver_for_team_member_id || null,
        hourly_rate: currentMember.hourly_rate ? Number(currentMember.hourly_rate) : null,
        is_active: currentMember.is_active !== undefined ? currentMember.is_active : true, // Default to active if not set
    };
    
    const result = await saveTeamMember(memberToSave, !editingMember);
    if (result) {
      handleCloseModal();
    } else {
      setFormError('Failed to save team member. Please try again.');
    }
  };

  const handleDelete = async (memberId: string) => {
    const memberToDelete = team.find(m => m.id === memberId);
    if (window.confirm(`Are you sure you want to delete ${memberToDelete?.name || 'this member'}?`)) {
      const success = await deleteTeamMember(memberId);
      if (!success) {
        alert('Failed to delete team member.');
      }
    }
  };
  
  const positions: Position[] = ['Sorter', 'DUC', 'Marshall', 'Admin', 'Manager']; // Updated positions

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Team Members</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus} disabled={isLoadingTeam}>
          Add Member
        </Button>
      </div>

      {isLoadingTeam && <p>Loading team members...</p>}
      {!isLoadingTeam && team.length === 0 && (
        <p className="text-gray-500">No team members configured yet.</p>
      )}
      {!isLoadingTeam && team.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Position</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">Sub-Depot</th>
                <th className="p-3 text-left font-medium">Rate</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.sort((a,b) => a.name.localeCompare(b.name)).map(member => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{member.name}</td>
                  <td className="p-3">{member.position}</td>
                  <td className="p-3">{member.email || 'N/A'}</td>
                  <td className="p-3">{subDepots.find(sd => sd.id === member.sub_depot_id)?.name || 'N/A'}</td>
                  <td className="p-3">{member.hourly_rate ? `£${member.hourly_rate.toFixed(2)}` : 'N/A'}</td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(member)} variant="ghost" size="sm" aria-label={`Edit ${member.name}`}>
                      <Edit size={16} />
                    </Button>
                    <Button onClick={() => handleDelete(member.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Delete ${member.name}`}>
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
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'} 
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isLoadingTeam}>
              {isLoadingTeam ? 'Saving...' : (editingMember ? 'Save Changes' : 'Add Member')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="member-name" value={currentMember.name || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
          </div>
          <div>
            <label htmlFor="member-position" className="block text-sm font-medium text-gray-700">Position</label>
            <select name="position" id="member-position" value={currentMember.position || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="member-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" id="member-email" value={currentMember.email || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
          </div>
           <div>
            <label htmlFor="member-phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input type="tel" name="phone_number" id="member-phone_number" value={currentMember.phone_number || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="member-delivery_unit_id" className="block text-sm font-medium text-gray-700">Delivery Unit</label>
            <select name="delivery_unit_id" id="member-delivery_unit_id" value={currentMember.delivery_unit_id || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
              <option value="">-- Select Delivery Unit --</option>
              {deliveryUnits.map(du => <option key={du.id} value={du.id}>{du.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="member-sub_depot_id" className="block text-sm font-medium text-gray-700">Sub Depot (Location)</label>
            <select name="sub_depot_id" id="member-sub_depot_id" value={currentMember.sub_depot_id || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
              <option value="">-- Select Sub Depot --</option>
              {subDepots.filter(sd => !currentMember.delivery_unit_id || sd.delivery_unit_id === currentMember.delivery_unit_id).map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
            </select>
          </div>
           <div>
            <label htmlFor="member-is_driver_for_team_member_id" className="block text-sm font-medium text-gray-700">Is Driver For (Team Member)</label>
            <select name="is_driver_for_team_member_id" id="member-is_driver_for_team_member_id" value={currentMember.is_driver_for_team_member_id || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
              <option value="">-- None --</option>
              {team.filter(tm => tm.id !== editingMember?.id && (tm.position === 'DUC' || tm.position === 'Marshall')).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="member-hourly_rate" className="block text-sm font-medium text-gray-700">Hourly Rate (£)</label>
            <input type="number" name="hourly_rate" id="member-hourly_rate" value={currentMember.hourly_rate || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" step="0.01" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_active" id="member-is_active" checked={currentMember.is_active === undefined ? true : currentMember.is_active} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <label htmlFor="member-is_active" className="ml-2 block text-sm text-gray-900">Active Member</label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default TeamManager; // Added default export
