
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { EmailTrigger, ReportTypeForEmail, SubDepot } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, Send, AlertTriangle, MailPlus } from 'lucide-react';
import { 
  generateDUCFinalReportEmail, 
  generateCageReturnReportEmail,
  generateLostPreventionReportEmail,
  generateDailyMissortSummaryEmail,
  generateWeeklyMissingSummaryEmail
} from '../../utils/emailGenerators';
import { TODAY_DATE_STRING } from '../../constants';
import { getIsoWeek, getWeekDates } from '../../utils/dateUtils'; 


const reportTypeOptions: { value: ReportTypeForEmail; label: string; needsSubDepotFilter?: boolean }[] = [
  { value: 'duc_final_report', label: 'DUC Final Report' },
  { value: 'cage_return_report', label: 'Cage Return Report', needsSubDepotFilter: true },
  { value: 'lost_prevention_report', label: 'Lost Prevention Report' },
  { value: 'daily_missort_summary', label: 'Daily Missort Summary', needsSubDepotFilter: true },
  { value: 'weekly_missing_summary', label: 'Weekly Missing Summary' },
  { value: 'worst_courier_performance_report', label: 'Worst Courier Performance' },
  { value: 'worst_round_performance_report', label: 'Worst Round Performance' },
  { value: 'client_missing_league_report', label: 'Client Missing League Table' },
  { value: 'top_misrouted_destinations_report', label: 'Top Misrouted Destinations' },
  { value: 'worst_courier_carry_forward_report', label: 'Worst Courier Carry Forwards' },
];

const EmailTriggersManager: React.FC = () => {
  const { 
    emailTriggers, addEmailTrigger, updateEmailTrigger, deleteEmailTrigger,
    subDepots, ducFinalReports, cageReturnReports, lostPreventionReports, dailyMissortSummaryReports, weeklyMissingSummaryReports,
    rounds, clients, team, 
  } = useSharedState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<EmailTrigger | null>(null);
  const [currentTrigger, setCurrentTrigger] = useState<Partial<EmailTrigger>>({});
  const [recipientsString, setRecipientsString] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (trigger?: EmailTrigger) => {
    setFormError(null);
    if (trigger) {
      setEditingTrigger(trigger);
      setCurrentTrigger(trigger);
      setRecipientsString(trigger.recipients.join(', '));
    } else {
      setEditingTrigger(null);
      setCurrentTrigger({ 
        report_type: 'duc_final_report', 
        frequency: 'daily', 
        send_time: '17:00', 
        is_enabled: true,
        sub_depot_id_filter: 'all',
      });
      setRecipientsString('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrigger(null);
    setCurrentTrigger({});
    setRecipientsString('');
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'recipientsString') {
        setRecipientsString(value);
        setCurrentTrigger(prev => ({ ...prev, recipients: value.split(',').map(s => s.trim()).filter(s => s) }));
    } else if (name === 'sub_depot_id_filter') { // Ensure name matches form field
        setCurrentTrigger(prev => ({ ...prev, [name]: value === 'all' ? 'all' : parseInt(value) }));
    } else {
        setCurrentTrigger(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };
  
  const handleSubmit = async () => {
    setFormError(null);
    if (!currentTrigger.name?.trim() || !currentTrigger.report_type || !currentTrigger.frequency || !currentTrigger.send_time || (currentTrigger.recipients || []).length === 0) {
      setFormError('Name, Report Type, Frequency, Send Time, and at least one Recipient are required.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(currentTrigger.send_time)) {
        setFormError('Send Time must be in HH:MM format.');
        return;
    }

    const triggerDataToSave: Omit<EmailTrigger, 'id' | 'createdAt' | 'updatedAt' | 'last_sent_at' | 'last_run_status' | 'last_error_message'> & { id?: string } = {
      name: currentTrigger.name.trim(),
      report_type: currentTrigger.report_type,
      frequency: currentTrigger.frequency as 'daily' | 'weekly' | 'monthly',
      day_of_week: currentTrigger.frequency === 'weekly' ? (Number(currentTrigger.day_of_week) || 0) : undefined,
      day_of_month: currentTrigger.frequency === 'monthly' ? (currentTrigger.day_of_month === 'last' ? 'last' : (Number(currentTrigger.day_of_month) || 1)) : undefined,
      send_time: currentTrigger.send_time,
      recipients: currentTrigger.recipients || [],
      sub_depot_id_filter: reportTypeOptions.find(rt => rt.value === currentTrigger.report_type)?.needsSubDepotFilter ? (currentTrigger.sub_depot_id_filter === undefined ? 'all' : currentTrigger.sub_depot_id_filter ) : undefined,
      is_enabled: currentTrigger.is_enabled || false,
      created_by_team_member_id: currentTrigger.created_by_team_member_id || undefined // Assuming this might be set elsewhere
    };
    
    let success;
    if (editingTrigger) {
      success = await updateEmailTrigger(editingTrigger.id, { ...triggerDataToSave, last_sent_at: editingTrigger.last_sent_at, last_run_status: editingTrigger.last_run_status, last_error_message: editingTrigger.last_error_message });
    } else {
      success = await addEmailTrigger(triggerDataToSave as Omit<EmailTrigger, 'id' | 'createdAt' | 'updatedAt' | 'last_sent_at' | 'last_run_status' | 'last_error_message'>);
    }

    if(success){
        handleCloseModal();
    } else {
        setFormError('Failed to save trigger. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete this email trigger?`)) {
      await deleteEmailTrigger(id);
    }
  };

  const calculateNextSendTime = (trigger: EmailTrigger): string => {
    const now = new Date();
    let nextSend = new Date(now);
    const [hours, minutes] = trigger.send_time.split(':').map(Number);

    if (trigger.frequency === 'daily') {
      nextSend.setHours(hours, minutes, 0, 0);
      if (nextSend <= now) nextSend.setDate(nextSend.getDate() + 1);
    } else if (trigger.frequency === 'weekly') {
      nextSend.setHours(hours, minutes, 0, 0);
      const currentDay = now.getDay(); 
      let daysUntilNext = (trigger.day_of_week! - currentDay + 7) % 7;
      if (daysUntilNext === 0 && nextSend <= now) daysUntilNext = 7;
      nextSend.setDate(now.getDate() + daysUntilNext);
    } else if (trigger.frequency === 'monthly') {
       nextSend.setHours(hours, minutes, 0, 0);
       if (trigger.day_of_month === 'last') {
           nextSend = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
           nextSend.setHours(hours, minutes, 0, 0);
           if (nextSend <= now) {
               nextSend = new Date(now.getFullYear(), now.getMonth() + 2, 0); 
               nextSend.setHours(hours, minutes, 0, 0);
           }
       } else {
           nextSend.setDate(Number(trigger.day_of_month!));
           if (nextSend.getMonth() !== now.getMonth() || nextSend <= now) {
               nextSend = new Date(now.getFullYear(), now.getMonth() + 1, Number(trigger.day_of_month!));
               nextSend.setHours(hours, minutes, 0, 0);
           }
       }
    }
    return nextSend.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleSendNow = async (trigger: EmailTrigger) => {
    let reportData: any = null;
    let emailContent: { subject: string, body: string } | null = null;
    const targetDate = TODAY_DATE_STRING;
    
    switch(trigger.report_type) {
      case 'duc_final_report':
        reportData = ducFinalReports.find(r => r.date === targetDate);
        if (reportData) emailContent = generateDUCFinalReportEmail(reportData, subDepots, rounds);
        break;
      case 'cage_return_report':
        reportData = cageReturnReports.find(r => 
          r.date === targetDate && 
          (trigger.sub_depot_id_filter === 'all' || (typeof trigger.sub_depot_id_filter === 'number' && r.sub_depot_id === trigger.sub_depot_id_filter))
        );
        if (reportData) emailContent = generateCageReturnReportEmail(reportData, subDepots);
        break;
      case 'lost_prevention_report': 
        reportData = lostPreventionReports.length > 0 ? lostPreventionReports[0] : null; 
        if (reportData) emailContent = generateLostPreventionReportEmail(reportData);
        break;
      case 'daily_missort_summary':
        reportData = dailyMissortSummaryReports.find(r => 
          r.date === targetDate && 
          (trigger.sub_depot_id_filter === 'all' || (typeof trigger.sub_depot_id_filter === 'number' && r.sub_depot_id === trigger.sub_depot_id_filter))
        );
        if (reportData) emailContent = generateDailyMissortSummaryEmail(reportData, subDepots, clients, rounds);
        break;
      case 'weekly_missing_summary':
        const today = new Date();
        const currentIsoWeek = getIsoWeek(today); 
        const { startDate } = getWeekDates(currentIsoWeek); 
        reportData = weeklyMissingSummaryReports.find(r => r.week_start_date === startDate.toISOString().split('T')[0]);
        if (reportData) emailContent = generateWeeklyMissingSummaryEmail(reportData, team, clients, rounds, subDepots);
        break;
      default:
        alert(`"Send Now" for report type "${trigger.report_type}" is not yet implemented.`);
        return;
    }

    if (!reportData) {
      alert(`No data found to generate the "${reportTypeOptions.find(rt=>rt.value === trigger.report_type)?.label}" report for "Send Now".`);
      return;
    }
    if (!emailContent) {
      alert(`Could not generate email content for "${reportTypeOptions.find(rt=>rt.value === trigger.report_type)?.label}".`);
      return;
    }

    const recipients = trigger.recipients.join(',');
    const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("This is a test send for the scheduled report '" + trigger.name + "'.\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`;
    
    window.open(mailtoLink, '_blank');
    await updateEmailTrigger(trigger.id, {...trigger, last_sent_at: new Date().toISOString(), last_run_status: 'success'});
    alert(`Email client opened for report: ${trigger.name}. Last sent time updated.`);
  };

  const selectedReportTypeConfig = reportTypeOptions.find(rt => rt.value === currentTrigger.report_type);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><MailPlus className="text-sky-600"/>Email Triggers (Scheduled Reports)</h2>
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
          Add Email Trigger
        </Button>
      </div>

      {emailTriggers.length === 0 ? (
        <p className="text-gray-500">No email triggers configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Report Type', 'Frequency', 'Next Send (Est.)', 'Recipients', 'Status', 'Actions'].map(h => (
                  <th key={h} className="p-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emailTriggers.map(trigger => (
                <tr key={trigger.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{trigger.name}</td>
                  <td className="p-3">{reportTypeOptions.find(rt => rt.value === trigger.report_type)?.label || trigger.report_type}</td>
                  <td className="p-3 capitalize">{trigger.frequency}</td>
                  <td className="p-3 text-xs">{trigger.is_enabled ? calculateNextSendTime(trigger) : 'Disabled'}</td>
                  <td className="p-3 text-xs truncate max-w-xs" title={trigger.recipients.join(', ')}>{trigger.recipients.join(', ')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ trigger.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {trigger.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-3 space-x-1 whitespace-nowrap">
                    <Button onClick={() => handleSendNow(trigger)} variant="ghost" size="sm" title="Send Now (Test)" className="text-blue-600"><Send size={16}/></Button>
                    <Button onClick={() => handleOpenModal(trigger)} variant="ghost" size="sm" title="Edit"><Edit size={16}/></Button>
                    <Button onClick={() => handleDelete(trigger.id)} variant="ghost" size="sm" title="Delete" className="text-red-600"><Trash2 size={16}/></Button>
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
        title={editingTrigger ? 'Edit Email Trigger' : 'Add Email Trigger'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingTrigger ? 'Save Changes' : 'Add Trigger'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div><label htmlFor="trigger-name" className="block text-sm font-medium">Trigger Name</label><input type="text" name="name" id="trigger-name" value={currentTrigger.name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" placeholder="e.g., Daily DUC Report to Ops"/></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="trigger-report_type" className="block text-sm font-medium">Report Type</label><select name="report_type" id="trigger-report_type" value={currentTrigger.report_type || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">{reportTypeOptions.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}</select></div>
            <div><label htmlFor="trigger-frequency" className="block text-sm font-medium">Frequency</label><select name="frequency" id="trigger-frequency" value={currentTrigger.frequency || 'daily'} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          </div>

          {currentTrigger.frequency === 'weekly' && (
            <div><label htmlFor="trigger-day_of_week" className="block text-sm font-medium">Day of Week</label><select name="day_of_week" id="trigger-day_of_week" value={currentTrigger.day_of_week || 0} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
                {[ {value: 0, label: "Sunday"}, {value: 1, label: "Monday"}, {value: 2, label: "Tuesday"}, {value: 3, label: "Wednesday"}, {value: 4, label: "Thursday"}, {value: 5, label: "Friday"}, {value: 6, label: "Saturday"}].map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
            </select></div>
          )}
          {currentTrigger.frequency === 'monthly' && (
            <div><label htmlFor="trigger-day_of_month" className="block text-sm font-medium">Day of Month</label><select name="day_of_month" id="trigger-day_of_month" value={currentTrigger.day_of_month || 1} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
                {Array.from({length: 31}, (_, i) => i + 1).map(d=><option key={d} value={d}>{d}</option>)}
                <option value="last">Last Day of Month</option>
            </select></div>
          )}
          <div><label htmlFor="trigger-send_time" className="block text-sm font-medium">Send Time (HH:MM)</label><input type="time" name="send_time" id="trigger-send_time" value={currentTrigger.send_time || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md"/></div>
          
          {selectedReportTypeConfig?.needsSubDepotFilter && (
            <div><label htmlFor="trigger-sub_depot_id_filter" className="block text-sm font-medium">Sub-Depot Filter</label><select name="sub_depot_id_filter" id="trigger-sub_depot_id_filter" value={currentTrigger.sub_depot_id_filter === undefined ? 'all' : currentTrigger.sub_depot_id_filter} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md">
                <option value="all">All Sub-Depots</option>
                {subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
            </select></div>
          )}

          <div><label htmlFor="trigger-recipients" className="block text-sm font-medium">Recipients (comma-separated emails)</label><input type="text" name="recipientsString" id="trigger-recipients" value={recipientsString} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" placeholder="email1@example.com, email2@example.com"/></div>
          <div className="flex items-center"><input type="checkbox" name="is_enabled" id="trigger-is_enabled" checked={currentTrigger.is_enabled || false} onChange={handleChange} className="h-4 w-4 rounded"/><label htmlFor="trigger-is_enabled" className="ml-2 text-sm font-medium">Enable this trigger</label></div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default EmailTriggersManager;
