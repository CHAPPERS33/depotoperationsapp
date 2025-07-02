
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { PayPeriod } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';

const PayPeriodsManager: React.FC = () => {
  const { payPeriods, fetchPayPeriods, savePayPeriod, deletePayPeriod, isLoadingPayPeriods } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayPeriod | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<Partial<PayPeriod>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayPeriods(); 
  }, [fetchPayPeriods]);

  const handleOpenModal = (period?: PayPeriod) => {
    setFormError(null);
    if (period) {
      setEditingPeriod(period);
      setCurrentPeriod({
        ...period,
        start_date: period.start_date.split('T')[0],
        end_date: period.end_date.split('T')[0],
      });
    } else {
      const currentYear = new Date().getFullYear();
      const nextPeriodNumber = payPeriods.filter(p=>p.year === currentYear).length + 1;
      setEditingPeriod(null);
      setCurrentPeriod({ 
        year: currentYear, 
        period_number: nextPeriodNumber, 
        status: 'Open', 
        start_date: TODAY_DATE_STRING, 
        end_date: TODAY_DATE_STRING 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPeriod(null);
    setCurrentPeriod({});
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentPeriod(prev => ({ 
      ...prev, 
      [name]: (name === 'year' || name === 'period_number') ? parseInt(value) : value 
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentPeriod.year || !currentPeriod.period_number || !currentPeriod.start_date || !currentPeriod.end_date || !currentPeriod.status) {
      setFormError('All fields (Year, Period #, Start Date, End Date, Status) are required.');
      return;
    }
    if (new Date(currentPeriod.end_date) < new Date(currentPeriod.start_date)) {
        setFormError('End Date cannot be before Start Date.');
        return;
    }

    const periodToSave: Partial<PayPeriod> = {
      id: editingPeriod?.id, 
      year: Number(currentPeriod.year),
      period_number: Number(currentPeriod.period_number),
      start_date: currentPeriod.start_date,
      end_date: currentPeriod.end_date,
      status: currentPeriod.status as PayPeriod['status'],
    };
    
    const result = await savePayPeriod(periodToSave, !editingPeriod);
    if (result) { 
      handleCloseModal();
    } else {
      setFormError('Failed to save pay period. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const periodToDelete = payPeriods.find(p => p.id === id);
    if (window.confirm(`Are you sure you want to delete Pay Period ${periodToDelete?.period_number}/${periodToDelete?.year}?`)) {
      const success = await deletePayPeriod(id);
      if(!success){
        alert('Failed to delete pay period. It might be referenced by forecasts or invoices.');
      }
    }
  };
  
  const statuses: PayPeriod['status'][] = ['Open', 'Closed', 'Invoiced', 'Paid', 'Archived'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Pay Periods</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus} disabled={isLoadingPayPeriods}>
          Add Pay Period
        </Button>
      </div>

      {isLoadingPayPeriods && <p>Loading pay periods...</p>}
      {!isLoadingPayPeriods && payPeriods.length === 0 && (
        <p className="text-gray-500">No pay periods configured yet.</p>
      )}
      {!isLoadingPayPeriods && payPeriods.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Year/Period</th>
                <th className="p-3 text-left font-medium">Start Date</th>
                <th className="p-3 text-left font-medium">End Date</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payPeriods.sort((a,b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.period_number - a.period_number;
              }).map(period => (
                <tr key={period.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs">{period.id.substring(0,8)}...</td>
                  <td className="p-3">{period.year}/{period.period_number}</td>
                  <td className="p-3">{new Date(period.start_date+'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                  <td className="p-3">{new Date(period.end_date+'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                  <td className="p-3">
                     <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${period.status === 'Open' ? 'bg-blue-100 text-blue-700' : period.status === 'Closed' ? 'bg-gray-200 text-gray-700' : period.status === 'Invoiced' ? 'bg-yellow-100 text-yellow-700' : period.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {period.status}
                     </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(period)} variant="ghost" size="sm" aria-label={`Edit Period ${period.period_number}/${period.year}`}>
                      <Edit size={16} />
                    </Button>
                    <Button onClick={() => handleDelete(period.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Delete Period ${period.period_number}/${period.year}`}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPeriod ? 'Edit Pay Period' : 'Add Pay Period'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="period-year" className="block text-sm font-medium text-gray-700">Year</label>
              <input type="number" name="year" id="period-year" value={currentPeriod.year || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label htmlFor="period-period_number" className="block text-sm font-medium text-gray-700">Period Number</label>
              <input type="number" name="period_number" id="period-period_number" value={currentPeriod.period_number || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="period-start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" name="start_date" id="period-start_date" value={currentPeriod.start_date || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label htmlFor="period-end_date" className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" name="end_date" id="period-end_date" value={currentPeriod.end_date || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
          </div>
          <div>
            <label htmlFor="period-status" className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" id="period-status" value={currentPeriod.status || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" required>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isLoadingPayPeriods}>{editingPeriod ? 'Save Changes' : 'Add Period'}</Button>
          </>
        }
      </Modal>
    </div>
  );
};

export default PayPeriodsManager;