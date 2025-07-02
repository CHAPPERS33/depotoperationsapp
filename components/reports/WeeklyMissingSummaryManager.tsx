
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { WeeklyMissingSummaryReport, RoundEntry, Client, TeamMember, WeeklyMissingSummaryParcelDetail } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { CalendarRange, Eye, Send, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { generateWeeklyMissingSummaryEmail } from '../../utils/emailGenerators';
import { getIsoWeek, getWeekDates } from '../../utils/dateUtils'; 


const WeeklyMissingSummaryManager: React.FC = () => {
  const {
    missingParcelsLog,
    clients,
    team,
    weeklyMissingSummaryReports, 
    addWeeklyMissingSummaryReport, 
    subDepots, 
    rounds 
  } = useSharedState();

  const [selectedWeek, setSelectedWeek] = useState<string>(getIsoWeek(new Date()));
  const [generatedReport, setGeneratedReport] = useState<WeeklyMissingSummaryReport | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);


  const handleGenerateReport = () => {
    setFormError(null);
    setFormSuccess(null);
    setGeneratedReport(null);

    if (!selectedWeek) {
      setFormError('Please select a week.');
      return;
    }

    const { startDate, endDate } = getWeekDates(selectedWeek);
    const startDateGB = startDate.toLocaleDateString('en-GB');
    const endDateGB = endDate.toLocaleDateString('en-GB');

    const parcelsInWeek = missingParcelsLog.filter(parcel => {
      if (!parcel.dateAdded) return false;
      try {
        const [day, month, year] = parcel.dateAdded.split('/').map(Number);
        const parcelDate = new Date(year, month - 1, day);
        return parcelDate >= startDate && parcelDate <= endDate;
      } catch (e) { return false; }
    });

    if (parcelsInWeek.length === 0) {
      setFormError(`No missing parcels found for the week of ${startDateGB} - ${endDateGB}.`);
      return;
    }

    const total_missing = parcelsInWeek.length;
    const missingByClientMap: Record<number, { client_id: number; client_name?: string; count: number }> = {};
    
    parcelsInWeek.forEach(p => {
      const clientInfo = clients.find(c => c.id === p.client_id);
      if (!missingByClientMap[p.client_id]) {
        missingByClientMap[p.client_id] = { client_id: p.client_id, client_name: clientInfo?.name || String(p.client_id), count: 0 };
      }
      missingByClientMap[p.client_id].count++;
    });
    
    const reportDetails: WeeklyMissingSummaryReport = {
      id: `WMS-${selectedWeek}-${Date.now()}`,
      week_start_date: startDate.toISOString().split('T')[0],
      week_end_date: endDate.toISOString().split('T')[0],
      total_missing,
      missing_by_client: Object.values(missingByClientMap).sort((a,b)=> b.count - a.count),
      parcels_summary: parcelsInWeek.map(p => {
        const sorterInfo = team.find(tm => tm.id === p.sorter_team_member_id);
        const clientInfo = clients.find(c => c.id === p.client_id);
        const subDepotInfo = subDepots.find(sd => sd.id === p.sub_depot_id);
        return {
          parcel_scan_entry_id: p.id,
          barcode: p.barcode,
          sorter_id: p.sorter_team_member_id,
          sorter_name: sorterInfo?.name || p.sorter_team_member_id,
          client_id: p.client_id, 
          client_name: clientInfo?.name || String(p.client_id),
          round_id: p.round_id,
          sub_depot_id: p.sub_depot_id,
          sub_depot_name: subDepotInfo?.name || String(p.sub_depot_id),
          date_added: p.dateAdded || '',
        };
      }),
      generated_at: new Date().toISOString(),
      generated_by_team_member_id: submittedBy || 'System',
      notes: undefined, // Explicitly setting notes
    };
    setGeneratedReport(reportDetails);
    setFormSuccess(`Report generated for week ${startDateGB} - ${endDateGB}. Review and save.`);
  };

  const handleSaveReport = () => {
    if (!generatedReport) {
      setFormError("Please generate a report first.");
      return;
    }
    if (!submittedBy.trim()) {
        setFormError("Please enter 'Submitted By' name.");
        return;
    }
    const finalReport: Omit<WeeklyMissingSummaryReport, 'id' | 'generated_at' | 'createdAt' | 'updatedAt'> = {
        week_start_date: generatedReport.week_start_date,
        week_end_date: generatedReport.week_end_date,
        total_missing: generatedReport.total_missing,
        missing_by_client: generatedReport.missing_by_client,
        parcels_summary: generatedReport.parcels_summary,
        notes: generatedReport.notes,
        generated_by_team_member_id: submittedBy.trim(),
    };
    addWeeklyMissingSummaryReport(finalReport);
    setFormSuccess('Weekly Missing Summary Report saved!');
    setGeneratedReport(null); 
    setSubmittedBy('');
  };
  
  const handlePreviewEmail = (report: WeeklyMissingSummaryReport) => {
    const emailContent = generateWeeklyMissingSummaryEmail(report, team, clients, rounds, subDepots);
    setEmailPreviewContent(emailContent);
    setEmailPreviewModalOpen(true);
  };

  const handleSendEmail = (report: WeeklyMissingSummaryReport) => {
     const emailContent = generateWeeklyMissingSummaryEmail(report, team, clients, rounds, subDepots);
     const mailtoLink = `mailto:reports@example.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("Please find the Weekly Missing Summary Report below:\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`;
     alert("Attempting to open your email client. Please review and send. (Actual API email integration pending)");
     window.open(mailtoLink, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center">
          <CalendarRange className="w-6 h-6 mr-2 text-indigo-600" />
          Weekly Missing Parcels Summary
        </h2>

        {formError && <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm flex items-center gap-2"><AlertTriangle size={18}/>{formError}</div>}
        {formSuccess && !generatedReport && <div className="mt-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm flex items-center gap-2"><CheckCircle size={18}/>{formSuccess}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-end">
          <div>
            <label htmlFor="weekPicker" className="block text-sm font-medium text-gray-700">Select Week</label>
            <input type="week" id="weekPicker" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
          </div>
          <Button onClick={handleGenerateReport} variant="secondary" className="w-full md:w-auto">Generate Report</Button>
        </div>

        {generatedReport && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">Report for Week: {new Date(generatedReport.week_start_date).toLocaleDateString('en-GB')} - {new Date(generatedReport.week_end_date).toLocaleDateString('en-GB')}</h3>
            <p><strong>Total Missing Parcels:</strong> {generatedReport.total_missing}</p>
            
            <div>
              <h4 className="font-medium">Missing by Client:</h4>
              {generatedReport.missing_by_client.length > 0 ? (
                <ul className="list-disc pl-5 text-sm">
                  {generatedReport.missing_by_client.map(mc => <li key={mc.client_id}>{mc.client_name}: {mc.count}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-500">No missing parcels to categorize by client.</p>}
            </div>

            <div>
              <h4 className="font-medium">Parcel Details ({generatedReport.parcels_summary.length}):</h4>
              {generatedReport.parcels_summary.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border rounded-md mt-1">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-1.5 text-left">Barcode</th><th className="p-1.5 text-left">Sorter</th><th className="p-1.5 text-left">Client</th><th className="p-1.5 text-left">Round</th><th className="p-1.5 text-left">Date Added</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {generatedReport.parcels_summary.map(p => (
                        <tr key={p.barcode + p.date_added + p.round_id} className="hover:bg-gray-50">
                          <td className="p-1.5">{p.barcode}</td>
                          <td className="p-1.5">{p.sorter_name}</td>
                          <td className="p-1.5">{p.client_name}</td>
                          <td className="p-1.5">R{p.round_id} (S{p.sub_depot_id})</td>
                          <td className="p-1.5">{p.date_added}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-gray-500">No parcel details to show.</p>}
            </div>
             <div className="pt-4 border-t">
                <label htmlFor="submittedByReport" className="block text-sm font-medium text-gray-700">Submitted By</label>
                <input type="text" id="submittedByReport" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} className="mt-1 block w-full md:w-1/2 p-2 border-gray-300 rounded-md shadow-sm" placeholder="Your Name" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveReport} variant="primary" leftIcon={FileText} disabled={!submittedBy.trim()}>Save This Report</Button>
            </div>
          </div>
        )}
      </div>

      {weeklyMissingSummaryReports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Saved Weekly Missing Summaries</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Week Of', 'Total Missing', 'Generated By', 'Actions'].map(h=><th key={h} className="p-2 text-left font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-200">
                {weeklyMissingSummaryReports.map(report => (
                  <tr key={report.id}>
                    <td className="p-2">{new Date(report.week_start_date).toLocaleDateString('en-GB')}</td>
                    <td className="p-2 text-center">{report.total_missing}</td>
                    <td className="p-2">{report.generated_by_name || report.generated_by_team_member_id}</td>
                    <td className="p-2 space-x-1">
                      <Button onClick={() => handlePreviewEmail(report)} variant="ghost" size="sm" leftIcon={Eye}>Preview</Button>
                      <Button onClick={() => handleSendEmail(report)} variant="ghost" size="sm" leftIcon={Send}>Send</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={emailPreviewModalOpen} onClose={() => setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">
        {emailPreviewContent && (<div className="prose max-w-none p-2 bg-white border rounded-md max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailPreviewContent.body }} />)}
        footer={<Button onClick={() => setEmailPreviewModalOpen(false)} variant="primary">Close Preview</Button>}
      </Modal>
    </div>
  );
};

export default WeeklyMissingSummaryManager;
