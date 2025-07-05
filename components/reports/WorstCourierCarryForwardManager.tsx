
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { WorstCourierCarryForwardReport, PeriodSelection } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { PackageX, CalendarDays, FileText, Eye, Send } from 'lucide-react';
import { getIsoWeek, getWeekDates } from '../../utils/dateUtils';

const WorstCourierCarryForwardManager: React.FC = () => {
  const {
    missingParcelsLog,
    couriers,
    worstCourierCarryForwardReports,
    addWorstCourierCarryForwardReport,
  } = useSharedState();

  const [periodType, setPeriodType] = useState<PeriodSelection>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>(getIsoWeek(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  const [generatedReport, setGeneratedReport] = useState<WorstCourierCarryForwardReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);

  const handleGenerateReport = () => {
    setFormError(null);
    setGeneratedReport(null);

    let startDateStr: string, endDateStr: string;
    if (periodType === 'day') { startDateStr = selectedDate; endDateStr = selectedDate; }
    else if (periodType === 'week') { const { startDate, endDate } = getWeekDates(selectedWeek); startDateStr = startDate.toISOString().split('T')[0]; endDateStr = endDate.toISOString().split('T')[0]; }
    else { const year = parseInt(selectedMonth.substring(0, 4)); const month = parseInt(selectedMonth.substring(5, 7)) - 1; startDateStr = new Date(year, month, 1).toISOString().split('T')[0]; endDateStr = new Date(year, month + 1, 0).toISOString().split('T')[0]; }
    
    const startDateObj = new Date(startDateStr + "T00:00:00Z");
    const endDateObj = new Date(endDateStr + "T23:59:59Z");

    const relevantParcels = missingParcelsLog.filter(p => {
      if (!p.dateAdded) return false;
      try { const [day, month, year] = p.dateAdded.split('/').map(Number); const parcelDate = new Date(year, month - 1, day); return parcelDate >= startDateObj && parcelDate <= endDateObj; } catch (e) { return false; }
    });

    const carryForwardEntries = relevantParcels.filter(p => p.scan_type === 'CarryForward' && p.courier_id);
    if (carryForwardEntries.length === 0) { setFormError('No carry forward data found for the selected period.'); return; }

    const courierCarryForwardCounts: Record<string, number> = {};
    carryForwardEntries.forEach(p => {
      if(p.courier_id) {
        courierCarryForwardCounts[p.courier_id] = (courierCarryForwardCounts[p.courier_id] || 0) + 1; // Count each CarryForward scan_type instance
      }
    });

    const sortedCouriers = Object.entries(courierCarryForwardCounts)
      .map(([courierId, totalCarryForwards]) => ({
        courierId,
        courierName: couriers.find(c => c.id === courierId)?.name || courierId,
        totalCarryForwards,
      }))
      .sort((a, b) => b.totalCarryForwards - a.totalCarryForwards);

    const report: WorstCourierCarryForwardReport = {
      id: `WCCF-${Date.now()}`, periodType, startDate: startDateStr, endDate: endDateStr,
      couriers: sortedCouriers, generatedAt: new Date().toISOString(), generatedBy: 'System',
    };
    setGeneratedReport(report);
  };

  const handleSaveReport = () => { if (generatedReport) { addWorstCourierCarryForwardReport(generatedReport); alert('Report saved!'); setGeneratedReport(null); } };
  const handlePreviewEmail = (report: WorstCourierCarryForwardReport) => { 
    const subject = `Worst Couriers for Carry Forwards: ${report.startDate} to ${report.endDate}`; 
    let body = `<h1>Worst Couriers for Carry Forwards</h1><p>Period: ${report.startDate} to ${report.endDate}</p>`; 
    if (report.couriers && report.couriers.length > 0) {
        report.couriers.slice(0,10).forEach(c => body += `<p>${c.courierName} (${c.courierId}): ${c.totalCarryForwards} carry forwards</p>`); 
    }
    setEmailPreviewContent({subject, body}); 
    setEmailPreviewModalOpen(true); 
  };
  const handleSendEmail = (report: WorstCourierCarryForwardReport) => { alert("Email sending not fully implemented."); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center"><PackageX className="w-6 h-6 mr-2 text-amber-600" /> Worst Courier for Carry Forwards Report</h2>
        {formError && <div className="mt-4 p-3 bg-red-100 text-red-700 border rounded-md text-sm">{formError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-end">
          <div><label className="text-sm">Period Type</label><select value={periodType} onChange={e => setPeriodType(e.target.value as PeriodSelection)} className="mt-1 block w-full p-2 border rounded-md"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></div>
          {periodType === 'day' && (<div><label className="text-sm">Date</label><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          {periodType === 'week' && (<div><label className="text-sm">Week</label><input type="week" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          {periodType === 'month' && (<div><label className="text-sm">Month</label><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          <div className="md:col-span-1"><Button onClick={handleGenerateReport} variant="primary" leftIcon={CalendarDays} className="w-full">Generate Report</Button></div>
        </div>
        {generatedReport && generatedReport.couriers && generatedReport.couriers.length > 0 && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">Report for {generatedReport.startDate} to {generatedReport.endDate} (Top 10)</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100"><tr>{['Rank', 'Courier', 'Total Carry Forwards'].map(h=><th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{generatedReport.couriers.slice(0,10).map((c, index) => (<tr key={c.courierId} className="border-b"><td className="p-2">#{index+1}</td><td className="p-2">{c.courierName} ({c.courierId})</td><td className="p-2 font-bold">{c.totalCarryForwards}</td></tr>))}</tbody></table></div>
            <div className="flex justify-end gap-2 mt-4"><Button onClick={() => handlePreviewEmail(generatedReport)} variant="outline" leftIcon={Eye}>Preview Email</Button><Button onClick={handleSaveReport} variant="secondary" leftIcon={FileText}>Save Report</Button></div>
          </div>
        )}
        {generatedReport && (!generatedReport.couriers || generatedReport.couriers.length === 0) && (
            <p className="mt-4 text-sm text-gray-500">No courier carry forward data to display for this period.</p>
        )}
      </div>
      {worstCourierCarryForwardReports && worstCourierCarryForwardReports.length > 0 && (<div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-3">Saved Reports</h3><div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Period', 'Dates', 'Generated By', 'Actions'].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{worstCourierCarryForwardReports.map(r=>(<tr key={r.id}><td className="p-2 capitalize">{r.periodType}</td><td className="p-2">{r.startDate} to {r.endDate}</td><td className="p-2">{r.generatedBy}</td><td className="p-2 space-x-1"><Button onClick={()=>handlePreviewEmail(r)} variant="ghost" size="sm" leftIcon={Eye}>View</Button><Button onClick={()=>handleSendEmail(r)} variant="ghost" size="sm" leftIcon={Send}>Send</Button></td></tr>))}</tbody></table></div></div>)}
      <Modal isOpen={emailPreviewModalOpen} onClose={()=>setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">{emailPreviewContent && <div className="prose max-w-none p-2" dangerouslySetInnerHTML={{__html: emailPreviewContent.body}}/>}</Modal>
    </div>
  );
};
export default WorstCourierCarryForwardManager;
