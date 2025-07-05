
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { DailyMissortSummaryReport } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { FileText, MailWarning, Eye, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';
import { generateDailyMissortSummaryEmail } from '../../utils/emailGenerators'; 

const DailyMissortSummaryManager: React.FC = () => {
  const {
    dailyMissortSummaryReports,
    addDailyMissortSummaryReport,
    cageAudits,
    subDepots,
    clients,
    rounds,
    team, 
  } = useSharedState();

  const [reportDate, setReportDate] = useState<string>(TODAY_DATE_STRING);
  const [selectedSubDepotFilterId, setSelectedSubDepotFilterId] = useState<string>(''); // Empty string for "All"
  const [generatedSummary, setGeneratedSummary] = useState<Partial<DailyMissortSummaryReport> | null>(null);
  const [submittedByTeamMemberId, setSubmittedByTeamMemberId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);

  useEffect(() => {
    setGeneratedSummary(null);
    setFormSuccess(null);
    setFormError(null);
  }, [reportDate, selectedSubDepotFilterId]);

  const handleGenerateSummary = () => {
    setFormError(null);
    setFormSuccess(null);
    setGeneratedSummary(null);

    let relevantAudits = cageAudits.filter(audit => audit.date === reportDate);
    if (selectedSubDepotFilterId) {
      relevantAudits = relevantAudits.filter(audit => audit.sub_depot_id === Number(selectedSubDepotFilterId));
    }

    if (relevantAudits.length === 0) {
      setFormError('No cage audits found for the selected date/sub-depot to generate a summary.');
      return;
    }

    let total_missorts = 0;
    const missorts_by_client_map: Record<number, { client_id: number; client_name?: string; count: number }> = {};
    const missorts_by_round_map: Record<string, { round_id: string; sub_depot_id: number; sub_depot_name?: string; count: number }> = {};


    relevantAudits.forEach(audit => {
      audit.missorted_parcels.forEach(mp => {
        total_missorts++;
        // By Client
        const clientInfo = clients.find(c => c.id === mp.client_id);
        if (!missorts_by_client_map[mp.client_id]) {
            missorts_by_client_map[mp.client_id] = { client_id: mp.client_id, client_name: clientInfo?.name || String(mp.client_id), count: 0 };
        }
        missorts_by_client_map[mp.client_id].count++;
        
        // By Round
        const roundKey = `${audit.round_id}-${audit.sub_depot_id}`;
        const subDepotInfo = subDepots.find(sd => sd.id === audit.sub_depot_id);
        if (!missorts_by_round_map[roundKey]) {
          missorts_by_round_map[roundKey] = { round_id: audit.round_id, sub_depot_id: audit.sub_depot_id, sub_depot_name: subDepotInfo?.name, count: 0 };
        }
        missorts_by_round_map[roundKey].count++;
      });
    });

    const summary: Partial<DailyMissortSummaryReport> = {
      date: reportDate,
      sub_depot_id: selectedSubDepotFilterId ? Number(selectedSubDepotFilterId) : undefined,
      total_missorts,
      missorts_by_client: Object.values(missorts_by_client_map).sort((a,b) => b.count - a.count),
      missorts_by_round: Object.values(missorts_by_round_map).sort((a,b) => b.count - a.count),
    };
    setGeneratedSummary(summary);
    setFormSuccess('Missort summary generated. Review and add submitter/notes before saving.');
  };

  const handleSaveReport = () => {
    if (!generatedSummary) {
      setFormError('Please generate a summary first.');
      return;
    }
    if (!submittedByTeamMemberId.trim()) {
      setFormError('Submitted By name is required to save the report.');
      return;
    }
    setFormError(null);

    const reportToSave: Omit<DailyMissortSummaryReport, 'id' | 'submitted_at' | 'createdAt' | 'updatedAt'> = {
      date: generatedSummary.date!,
      sub_depot_id: generatedSummary.sub_depot_id,
      total_missorts: generatedSummary.total_missorts!,
      missorts_by_client: generatedSummary.missorts_by_client!,
      missorts_by_round: generatedSummary.missorts_by_round!,
      notes: notes.trim() || undefined,
      submitted_by_team_member_id: submittedByTeamMemberId.trim(),
    };

    addDailyMissortSummaryReport(reportToSave);
    setFormSuccess('Daily Missort Summary Report saved!');
    setGeneratedSummary(null); 
    setSubmittedByTeamMemberId('');
    setNotes('');
  };
  
  const getSubDepotNameDisplay = (id?: number) => id ? (subDepots.find(sd => sd.id === id)?.name || `Sub ${id}`) : 'All Sub-Depots';

  const handlePreviewEmail = (report: DailyMissortSummaryReport) => {
    const emailContent = generateDailyMissortSummaryEmail(report, subDepots, clients, rounds);
    setEmailPreviewContent(emailContent);
    setEmailPreviewModalOpen(true);
  };

  const handleSendEmail = (report: DailyMissortSummaryReport) => {
    const emailContent = generateDailyMissortSummaryEmail(report, subDepots, clients, rounds);
    const mailtoLink = `mailto:reports@example.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("Please find the Daily Missort Summary Report attached or view below:\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`; 
    alert("Attempting to open your email client. Please review and send. For full HTML, use the 'Preview Email' and copy content if needed. (Actual API email integration pending)");
    window.open(mailtoLink, '_blank');
  };


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center">
          <MailWarning className="w-6 h-6 mr-2 text-teal-600" />
          Daily Missort Summary Report
        </h2>

        {formError && <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm flex items-center gap-2"><AlertTriangle size={18}/>{formError}</div>}
        {formSuccess && !generatedSummary && <div className="mt-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm flex items-center gap-2"><CheckCircle size={18}/>{formSuccess}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
          <div>
            <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label>
            <input type="date" id="reportDate" value={reportDate} onChange={(e) => setReportDate(e.target.value)} max={TODAY_DATE_STRING} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="selectedSubDepotFilterId" className="block text-sm font-medium text-gray-700">Sub-Depot</label>
            <select id="selectedSubDepotFilterId" value={selectedSubDepotFilterId} onChange={(e) => setSelectedSubDepotFilterId(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
              <option value="">All Sub-Depots</option>
              {subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
            </select>
          </div>
          <Button onClick={handleGenerateSummary} variant="secondary" className="w-full md:w-auto">Generate Summary</Button>
        </div>

        {generatedSummary && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">Summary for {new Date(generatedSummary.date!).toLocaleDateString('en-GB')} - {getSubDepotNameDisplay(generatedSummary.sub_depot_id)}</h3>
            <p><strong>Total Missorts:</strong> {generatedSummary.total_missorts}</p>
            
            <div>
              <h4 className="font-medium">Missorts by Client:</h4>
              {generatedSummary.missorts_by_client?.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {generatedSummary.missorts_by_client.map(mc => <li key={mc.client_id}>{mc.client_name || mc.client_id}: {mc.count}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-500">No missorts by client.</p>}
            </div>

            <div>
              <h4 className="font-medium">Missorts by Round:</h4>
              {generatedSummary.missorts_by_round?.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {generatedSummary.missorts_by_round.map(mr => <li key={`${mr.round_id}-${mr.sub_depot_id}`}>Round {mr.round_id} ({mr.sub_depot_name || getSubDepotNameDisplay(mr.sub_depot_id)}): {mr.count}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-500">No missorts by round.</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                 <div><label htmlFor="submittedByTeamMemberId" className="block text-sm font-medium text-gray-700">Submitted By</label><input type="text" id="submittedByTeamMemberId" value={submittedByTeamMemberId} onChange={(e) => setSubmittedByTeamMemberId(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" placeholder="Your Name" /></div>
                <div><label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" placeholder="Optional notes..."></textarea></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveReport} variant="primary" leftIcon={FileText} disabled={!submittedByTeamMemberId.trim()}>Save Report</Button>
            </div>
          </div>
        )}
      </div>

      {dailyMissortSummaryReports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Saved Daily Missort Summaries</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Date', 'Sub-Depot Scope', 'Total Missorts', 'Submitted By', 'Actions'].map(h=><th key={h} className="p-2 text-left font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-200">
                {dailyMissortSummaryReports.map(report => (
                  <tr key={report.id}>
                    <td className="p-2">{new Date(report.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-2">{getSubDepotNameDisplay(report.sub_depot_id)}</td>
                    <td className="p-2 text-center">{report.total_missorts}</td>
                    <td className="p-2">{report.submitted_by_name || report.submitted_by_team_member_id}</td>
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

export default DailyMissortSummaryManager;
