
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { AvailabilityRecord } from '../../types';
import Button from '../shared/Button';
import { ChevronLeft, ChevronRight, CalendarDays, User, Edit2, CheckCircle, XCircle, Dot, Trash2 } from 'lucide-react';

const AvailabilityCalendarManager: React.FC = () => {
  const {
    team,
    addOrUpdateAvailabilityRecord,
    removeAvailabilityRecord,
    getAvailabilityForMemberDate,
    workSchedules,
  } = useSharedState();

  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [editingNotesFor, setEditingNotesFor] = useState<{ date: string; notes: string } | null>(null);

  useEffect(() => {
    if (team.length > 0 && !selectedTeamMemberId) {
      setSelectedTeamMemberId(team[0].id);
    }
  }, [team, selectedTeamMemberId]);

  const selectedTeamMember = useMemo(() => team.find(tm => tm.id === selectedTeamMemberId), [team, selectedTeamMemberId]);

  const daysInMonth = (year: number, month: number): Date[] => {
    const date = new Date(year, month, 1);
    const days: Date[] = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

  const emptyStartCells = Array(startingDayOfWeek).fill(null);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const getAvailabilityStatus = (date: string): AvailabilityRecord['status'] | 'Not Set' => {
    if (!selectedTeamMemberId) return 'Not Set';
    const record = getAvailabilityForMemberDate(selectedTeamMemberId, date);
    return record ? record.status : 'Not Set';
  };

  const getAvailabilityNotes = (date: string): string | undefined => {
  if (!selectedTeamMemberId) return undefined;
  return getAvailabilityForMemberDate(selectedTeamMemberId, date)?.notes || undefined;
};

  const isScheduled = (dateStr: string): boolean => {
    if (!selectedTeamMemberId) return false;
    return workSchedules.some(ws => ws.team_member_id === selectedTeamMemberId && ws.date === dateStr && (ws.scheduled_hours ?? 0) > 0);
  };

  const handleDayClick = (dateStr: string) => {
    if (!selectedTeamMemberId) return;
    const currentStatus = getAvailabilityStatus(dateStr);
    const currentNotes = getAvailabilityNotes(dateStr);
    let newStatus: AvailabilityRecord['status'] | null = null;

    if (currentStatus === 'Not Set') newStatus = 'Available';
    else if (currentStatus === 'Available') newStatus = 'Unavailable';
    else if (currentStatus === 'Unavailable') newStatus = null; // This will remove the record

    const recordPayload: Omit<AvailabilityRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        team_member_id: selectedTeamMemberId,
        date: dateStr,
        status: newStatus || 'Available', // Default to available if newStatus is null (which means clear)
        notes: currentNotes,
    };


    if (newStatus) {
      addOrUpdateAvailabilityRecord(recordPayload);
    } else {
      removeAvailabilityRecord(selectedTeamMemberId, dateStr);
    }
  };

  const handleMarkWeek = (status: 'Available' | 'Unavailable' | 'Clear') => {
    if (!selectedTeamMemberId) return;
    const firstDayOfWeek = new Date(currentDate);
    const targetDate = new Date(firstDayOfWeek); 

    for (let i = 0; i < 7; i++) {
      const dateStr = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + i).toISOString().split('T')[0];
      if (status === 'Clear') {
        removeAvailabilityRecord(selectedTeamMemberId, dateStr);
      } else {
        const recordPayload: Omit<AvailabilityRecord, 'id' | 'createdAt' | 'updatedAt'> = {
            team_member_id: selectedTeamMemberId,
            date: dateStr,
            status: status,
            notes: getAvailabilityNotes(dateStr), 
        };
        addOrUpdateAvailabilityRecord(recordPayload);
      }
    }
  };

  const handleNotesEdit = (dateStr: string) => {
    setEditingNotesFor({ date: dateStr, notes: getAvailabilityNotes(dateStr) || '' });
  };

  const handleSaveNotes = () => {
    if (editingNotesFor && selectedTeamMemberId) {
      const record = getAvailabilityForMemberDate(selectedTeamMemberId, editingNotesFor.date);
      const recordPayload: Omit<AvailabilityRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        team_member_id: selectedTeamMemberId,
        date: editingNotesFor.date,
        status: record?.status || 'Available', 
        notes: editingNotesFor.notes.trim() || undefined,
      };
      addOrUpdateAvailabilityRecord(recordPayload);
      setEditingNotesFor(null);
    }
  };
  
  const getStatusColorClasses = (status: AvailabilityRecord['status'] | 'Not Set', dateStr: string): string => {
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    let baseClasses = isToday ? 'border-2 border-blue-500 ' : 'border border-gray-200 ';

    switch (status) {
      case 'Available': return baseClasses + 'bg-green-100 hover:bg-green-200 text-green-800';
      case 'Unavailable': return baseClasses + 'bg-red-100 hover:bg-red-200 text-red-800';
      default: return baseClasses + 'bg-white hover:bg-gray-100 text-gray-700';
    }
  };


  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-semibold flex items-center">
          <CalendarDays className="w-6 h-6 mr-2 text-rose-600" /> Manage Team Availability
        </h2>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          <select
            value={selectedTeamMemberId}
            onChange={(e) => setSelectedTeamMemberId(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">-- Select Team Member --</option>
            {team.map(tm => (
              <option key={tm.id} value={tm.id}>{tm.name} ({tm.position})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTeamMember && (
        <>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
            <Button onClick={() => changeMonth(-1)} variant="outline" size="sm" leftIcon={ChevronLeft}>Prev</Button>
            <h3 className="text-lg font-semibold text-gray-700">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <Button onClick={() => changeMonth(1)} variant="outline" size="sm" rightIcon={ChevronRight}>Next</Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 border-b pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {emptyStartCells.map((_, index) => <div key={`empty-${index}`} className="border border-gray-100 bg-gray-50 h-24 sm:h-28 rounded-md"></div>)}
            {monthDays.map(day => {
              const dateStr = day.toISOString().split('T')[0];
              const status = getAvailabilityStatus(dateStr);
              const notes = getAvailabilityNotes(dateStr);
              const scheduled = isScheduled(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`p-2 rounded-md cursor-pointer flex flex-col justify-between min-h-[6rem] sm:min-h-[7rem] transition-colors duration-150 ${getStatusColorClasses(status, dateStr)}`}
                  onClick={() => handleDayClick(dateStr)}
                  role="button"
                  aria-pressed={status !== 'Not Set'}
                  aria-label={`Date ${day.getDate()}, Status: ${status}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{day.getDate()}</span>
                    {scheduled && <Dot className="w-6 h-6 text-blue-700" />}
                  </div>
                  <div className="text-xs mt-1 text-center capitalize flex-grow flex items-center justify-center">
                    {status !== 'Not Set' && status}
                  </div>
                  <div className="mt-auto flex justify-end items-center">
                    {notes && <span title={notes}><Edit2 size={12} className="text-gray-500 opacity-70 mr-1" /></span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNotesEdit(dateStr); }}
                      className="p-0.5 hover:bg-gray-300 rounded-full opacity-60 hover:opacity-100"
                      aria-label="Edit notes"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
             <Button onClick={() => handleMarkWeek('Available')} variant="ghost" size="sm" leftIcon={CheckCircle} className="text-green-600 border-green-600 hover:bg-green-50">Mark First Displayed Week Available</Button>
             <Button onClick={() => handleMarkWeek('Unavailable')} variant="ghost" size="sm" leftIcon={XCircle} className="text-red-600 border-red-600 hover:bg-red-50">Mark First Displayed Week Unavailable</Button>
             <Button onClick={() => handleMarkWeek('Clear')} variant="ghost" size="sm" leftIcon={Trash2} className="text-gray-600 border-gray-600 hover:bg-gray-100">Clear First Displayed Week</Button>
          </div>
          <div className="mt-4 text-xs text-gray-600">
            <p><span className="inline-block w-3 h-3 bg-green-100 border border-gray-200 mr-1"></span> Available</p>
            <p><span className="inline-block w-3 h-3 bg-red-100 border border-gray-200 mr-1"></span> Unavailable</p>
            <p><span className="inline-block w-3 h-3 bg-white border border-gray-200 mr-1"></span> Not Set</p>
            <p><Dot className="inline-block w-4 h-4 text-blue-700 mr-0.5 -ml-0.5" /> Scheduled to work</p>
            <p><span className="inline-block w-3 h-3 border-2 border-blue-500 mr-1"></span> Today's Date</p>
          </div>
        </>
      )}
      {!selectedTeamMember && team.length > 0 && (
        <p className="text-center text-gray-500 py-8">Please select a team member to view or manage their availability.</p>
      )}
      {team.length === 0 && (
        <p className="text-center text-gray-500 py-8">No team members found. Please add team members in Setup first.</p>
      )}

      {editingNotesFor && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
            <h4 className="text-lg font-semibold">Notes for {new Date(editingNotesFor.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</h4>
            <textarea
              value={editingNotesFor.notes}
              onChange={(e) => setEditingNotesFor(prev => prev ? { ...prev, notes: e.target.value } : null)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Optional notes for this day..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingNotesFor(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveNotes}>Save Notes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendarManager;
