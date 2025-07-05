
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { ClientMissingLeagueReport, PeriodSelection } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { ListChecks, CalendarDays, FileText, Eye, Send } from 'lucide-react';
import { getIsoWeek, getWeekDates } from '../../utils/dateUtils';

const ClientMissingLeagueManager: React.FC = () => {
  const {
    missingParcelsLog,
    clients,
    clientMissingLeagueReports,
    addClientMissingLeagueReport,
  } = useSharedState();

  const [periodType, setPeriodType] = useState<PeriodSelection>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>(getIsoWeek(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  const [generatedReport, setGeneratedReport] = useState<ClientMissingLeagueReport | null>(null);
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

    if (relevantParcels.length === 0) { setFormError('No missing parcel data found for the selected period.'); return; }

    const clientCounts: Record<number, number> = {}; // Use client_id as key
    relevantParcels.forEach(p => {
      if (p.client_id) { // Ensure client_id exists
        clientCounts[p.client_id] = (clientCounts[p.client_id] || 0) + 1;
      }
    });

    const sortedClients = Object.entries(clientCounts)
      .map(([clientIdStr, totalMissing]) => {
        const clientId = Number(clientIdStr);
        const clientInfo = clients.find(c => c.id === clientId);
        return {
          clientId: clientId,
          clientName: clientInfo?.name || `Client ID: ${clientId}`,
          totalMissing,
          rank: 0 
        };
      })
      .sort((a, b) => b.totalMissing - a.totalMissing)
      .map((c, index) => ({ ...c, rank: index + 1 }));

    const report: ClientMissingLeagueReport = {
      id: `CML-${Date.now()}`, periodType, startDate: startDateStr, endDate: endDateStr,
      clients: sortedClients, generatedAt: new Date().toISOString(), generatedBy: 'System',
    };
    setGeneratedReport(report);
  };

  const handleSaveReport = () => { if (generatedReport) { addClientMissingLeagueReport(generatedReport); alert('Report saved!'); setGeneratedReport(null); } };
  const handlePreviewEmail = (report: ClientMissingLeagueReport) => { 
    const subject = `Client Missing League: ${report.startDate} to ${report.endDate}`; 
    let body = `<h1>Client Missing League</h1><p>Period: ${report.startDate} to ${report.endDate}</p>`; 
    if (report.clients && report.clients.length > 0) {
        report.clients.slice(0,10).forEach(c => body += `<p>#${c.rank} ${c.clientName}: ${c.totalMissing} missing</p>`); 
    }
    setEmailPreviewContent({subject, body}); 
    setEmailPreviewModalOpen(true); 
  };
  const handleSendEmail = (report: ClientMissingLeagueReport) => { alert("Email sending not fully implemented."); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center"><ListChecks className="w-6 h-6 mr-2 text-cyan-600" /> Client Missing League Table</h2>
        {formError && <div className="mt-4 p-3 bg-red-100 text-red-700 border rounded-md text-sm">{formError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-end">
          <div><label className="text-sm">Period Type</label><select value={periodType} onChange={e => setPeriodType(e.target.value as PeriodSelection)} className="mt-1 block w-full p-2 border rounded-md"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></div>
          {periodType === 'day' && (<div><label className="text-sm">Date</label><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          {periodType === 'week' && (<div><label className="text-sm">Week</label><input type="week" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          {periodType === 'month' && (<div><label className="text-sm">Month</label><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full p-2 border rounded-md"/></div>)}
          <div className="md:col-span-1"><Button onClick={handleGenerateReport} variant="primary" leftIcon={CalendarDays} className="w-full">Generate Report</Button></div>
        </div>
        {generatedReport && generatedReport.clients && generatedReport.clients.length > 0 && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">Report for {generatedReport.startDate} to {generatedReport.endDate}</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100"><tr>{['Rank', 'Client Name', 'Total Missing'].map(h=><th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{generatedReport.clients.map(c => (<tr key={c.clientId} className="border-b"><td className="p-2">#{c.rank}</td><td className="p-2">{c.clientName}</td><td className="p-2 font-bold">{c.totalMissing}</td></tr>))}</tbody></table></div>
            <div className="flex justify-end gap-2 mt-4"><Button onClick={() => handlePreviewEmail(generatedReport)} variant="outline" leftIcon={Eye}>Preview Email</Button><Button onClick={handleSaveReport} variant="secondary" leftIcon={FileText}>Save Report</Button></div>
          </div>
        )}
        {generatedReport && (!generatedReport.clients || generatedReport.clients.length === 0) && (
            <p className="mt-4 text-sm text-gray-500">No client missing data to display for this period.</p>
        )}
      </div>
      {clientMissingLeagueReports && clientMissingLeagueReports.length > 0 && (<div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold mb-3">Saved Reports</h3><div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Period', 'Dates', 'Generated By', 'Actions'].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{clientMissingLeagueReports.map(r=>(<tr key={r.id}><td className="p-2 capitalize">{r.periodType}</td><td className="p-2">{r.startDate} to {r.endDate}</td><td className="p-2">{r.generatedBy}</td><td className="p-2 space-x-1"><Button onClick={()=>handlePreviewEmail(r)} variant="ghost" size="sm" leftIcon={Eye}>View</Button><Button onClick={()=>handleSendEmail(r)} variant="ghost" size="sm" leftIcon={Send}>Send</Button></td></tr>))}</tbody></table></div></div>)}
      <Modal isOpen={emailPreviewModalOpen} onClose={()=>setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">{emailPreviewContent && <div className="prose max-w-none p-2" dangerouslySetInnerHTML={{__html: emailPreviewContent.body}}/>}</Modal>
    </div>
  );
};
export default ClientMissingLeagueManager;
