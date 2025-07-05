
import React, { useState, useEffect } from 'react';
import { DUCFinalReport, FailedRound, SegregatedParcel } from '../../types';
import { useSharedState } from '../../hooks/useSharedState';
import { getTodaysMissingParcelsSummaryForReport } from '../../utils/reportUtils';
import { generateDUCFinalReportEmail } from '../../utils/emailGenerators';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Trash2, FileText, Send, Eye } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';

const initialFailedRoundState: Omit<FailedRound, 'id' | 'duc_final_report_id'> = { round_id: "", sub_depot_id: 0, drop_number: 0, comments: '' }; 
const initialSegregatedParcelState: Omit<SegregatedParcel, 'id' | 'duc_final_report_id' | 'client_id'> & {client: string} = { barcode: '', client: '', count: 1 };


const DUCReportManager: React.FC = () => {
  const {
    ducFinalReports, addDUCFinalReport,
    rounds, subDepots, clients,
    missingParcelsLog
  } = useSharedState();

  const [reportDate, setReportDate] = useState<string>(TODAY_DATE_STRING);
  const [submittedByTeamMemberId, setSubmittedByTeamMemberId] = useState<string>('');
  const [failedRoundsData, setFailedRoundsData] = useState<Omit<FailedRound, 'id' | 'duc_final_report_id'>[]>([initialFailedRoundState]);
  const [totalReturns, setTotalReturns] = useState<number>(0);
  const [segregatedParcelsData, setSegregatedParcelsData] = useState<(Omit<SegregatedParcel, 'id' | 'duc_final_report_id' | 'client_id'> & {client: string})[]>([initialSegregatedParcelState]);
  const [notes, setNotes] = useState<string>('');
  const [importedMissingSummary, setImportedMissingSummary] = useState<DUCFinalReport['missing_parcels_summary'] | null>(null);
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isEmailPreviewModalOpen, setIsEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);
  
  const existingReportForDate = ducFinalReports.find(r => r.date === reportDate);

  useEffect(() => {
    if (existingReportForDate) {
      setSubmittedByTeamMemberId(existingReportForDate.submitted_by_team_member_id);
      setFailedRoundsData(existingReportForDate.failed_rounds.length > 0 ? [...existingReportForDate.failed_rounds.map(fr => ({round_id: fr.round_id, sub_depot_id: fr.sub_depot_id, drop_number: fr.drop_number, comments: fr.comments}))] : [initialFailedRoundState]);
      setTotalReturns(existingReportForDate.total_returns);
      setSegregatedParcelsData(existingReportForDate.segregated_parcels.length > 0 ? [...existingReportForDate.segregated_parcels.map(sp => ({barcode: sp.barcode, client: clients.find(c=>c.id === sp.client_id)?.name || String(sp.client_id) , count: sp.count}))] : [initialSegregatedParcelState]);
      setNotes(existingReportForDate.notes || '');
      setImportedMissingSummary(existingReportForDate.missing_parcels_summary);
      setFormSuccess(`Loaded existing report for ${new Date(reportDate + 'T00:00:00Z').toLocaleDateString('en-GB')}. Submitted by ${existingReportForDate.submitted_by_name} at ${new Date(existingReportForDate.submitted_at).toLocaleTimeString()}.`);
      setFormError(null);
    } else {
      resetFormForNewReport();
    }
  }, [reportDate, ducFinalReports, clients]);

  const resetFormForNewReport = () => {
    setSubmittedByTeamMemberId('');
    setFailedRoundsData([initialFailedRoundState]);
    setTotalReturns(0);
    setSegregatedParcelsData([initialSegregatedParcelState]);
    setNotes('');
    setImportedMissingSummary(null);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleFailedRoundChange = (index: number, field: keyof Omit<FailedRound, 'id' | 'duc_final_report_id'>, value: string | number) => {
    const updated = [...failedRoundsData];
    if (field === 'round_id') {
      const selectedRound = rounds.find(r => r.id === String(value)); 
      updated[index] = { 
        ...updated[index], 
        round_id: String(value), 
        sub_depot_id: selectedRound?.sub_depot_id || 0, 
        drop_number: selectedRound?.drop_number || 0 
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setFailedRoundsData(updated);
  };
  const addFailedRound = () => setFailedRoundsData([...failedRoundsData, { ...initialFailedRoundState, round_id: rounds[0]?.id || "", sub_depot_id: rounds[0]?.sub_depot_id || 0, drop_number: rounds[0]?.drop_number || 0 }]);
  const removeFailedRound = (index: number) => setFailedRoundsData(failedRoundsData.filter((_, i) => i !== index));

  const handleSegregatedParcelChange = (index: number, field: keyof (Omit<SegregatedParcel, 'id' | 'duc_final_report_id'| 'client_id'> & {client: string}), value: string | number) => {
    const updated = [...segregatedParcelsData];
    (updated[index] as any)[field] = field === 'count' ? Number(value) : value;
    setSegregatedParcelsData(updated);
  };
  const addSegregatedParcel = () => setSegregatedParcelsData([...segregatedParcelsData, initialSegregatedParcelState]);
  const removeSegregatedParcel = (index: number) => setSegregatedParcelsData(segregatedParcelsData.filter((_, i) => i !== index));

  const handleImportMissingParcels = () => {
    const summary = getTodaysMissingParcelsSummaryForReport(missingParcelsLog, reportDate); 
    setImportedMissingSummary(summary);
    setFormSuccess('Missing parcels summary imported for selected date.');
  };

  const handleSubmitReport = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!reportDate || !submittedByTeamMemberId.trim()) {
      setFormError('Report Date and Submitted By name are required.');
      return;
    }
    if (!importedMissingSummary) {
      setFormError('Please import the missing parcels summary before submitting.');
      return;
    }

    const finalFailedRounds = failedRoundsData.filter(fr => fr.round_id !== ""); 
    const finalSegregatedParcels = segregatedParcelsData.filter(sp => sp.barcode.trim() !== '' && sp.client.trim() !== '' && sp.count > 0);
    
    const formDataInstance = new FormData();
    formDataInstance.append('date', reportDate);
    formDataInstance.append('submitted_by_team_member_id', submittedByTeamMemberId.trim());
    formDataInstance.append('total_returns', String(Number(totalReturns) || 0));
    formDataInstance.append('notes', notes.trim());
    formDataInstance.append('failed_rounds', JSON.stringify(finalFailedRounds));
    formDataInstance.append('segregated_parcels', JSON.stringify(finalSegregatedParcels.map(sp => ({...sp, client_id: clients.find(c=>c.name === sp.client)?.id || 0})))); // Pass client_id to backend
    formDataInstance.append('missing_parcels_summary', JSON.stringify(importedMissingSummary));

    const subDepotIdForReport = subDepots.find(sd => sd.name.includes("Edmonton"))?.id || subDepots[0]?.id; 
    if (subDepotIdForReport) { 
        formDataInstance.append('sub_depot_id', String(subDepotIdForReport));
    }
    
    const result = await addDUCFinalReport(formDataInstance);
    if (result) {
        setFormSuccess(`DUC Final Report for ${new Date(reportDate + 'T00:00:00Z').toLocaleDateString('en-GB')} submitted successfully!`);
    } else {
        setFormError('Failed to submit DUC report. Check console.');
    }
  };

  const handlePreviewEmail = () => {
      const reportToPreview = ducFinalReports.find(r => r.date === reportDate); 
      if (!reportToPreview) {
          alert("No report data available to preview email. Please submit the report first or load an existing one.");
          return;
      }
      const emailContent = generateDUCFinalReportEmail(reportToPreview, subDepots, rounds);
      setEmailPreviewContent(emailContent);
      setIsEmailPreviewModalOpen(true);
  };
  
  const handleSendEmail = () => {
    const reportToSend = ducFinalReports.find(r => r.date === reportDate);
    if (!reportToSend) {
      alert("Report not found for sending. Please ensure it's submitted.");
      return;
    }
    const emailContent = generateDUCFinalReportEmail(reportToSend, subDepots, rounds);
    const mailtoLink = `mailto:reports@example.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("Please find the DUC Final Report attached or view below:\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`;
    alert("Attempting to open your email client. Please review and send. For full HTML, use the 'Preview Email' and copy content if needed. (Actual API email integration pending)");
    window.open(mailtoLink, '_blank');
  };


  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">DUC Final Report</h2>
      
      {formError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">{formError}</div>}
      {formSuccess && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm">{formSuccess}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
        <div><label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label><input type="date" id="reportDate" value={reportDate} onChange={(e) => setReportDate(e.target.value)} max={TODAY_DATE_STRING} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required /></div>
        <div><label htmlFor="submittedByTeamMemberId" className="block text-sm font-medium text-gray-700">Submitted By (Your Name)</label><input type="text" id="submittedByTeamMemberId" value={submittedByTeamMemberId} onChange={(e) => setSubmittedByTeamMemberId(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required /></div>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Failed Rounds ({failedRoundsData.filter(fr => fr.round_id !== "").length})</h3>
        {failedRoundsData.map((fr, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3 p-3 border rounded-md bg-gray-50 items-start">
            <div className="md:col-span-3"><label className="text-xs text-gray-500">Round</label><select value={fr.round_id} onChange={(e) => handleFailedRoundChange(index, 'round_id', e.target.value)} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md"><option value="">-- Select Round --</option>{rounds.map(r => <option key={r.id} value={r.id}>R{r.id} (Sub {r.sub_depot_id})</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-500">Sub-Depot</label><input type="text" value={subDepots.find(s => s.id === fr.sub_depot_id)?.name || 'N/A'} className="mt-1 block w-full p-1.5 text-sm bg-gray-100 border-gray-300 rounded-md" readOnly /></div>
            <div className="md:col-span-1"><label className="text-xs text-gray-500">Drop</label><input type="text" value={fr.drop_number || 'N/A'} className="mt-1 block w-full p-1.5 text-sm bg-gray-100 border-gray-300 rounded-md" readOnly /></div>
            <div className="md:col-span-5"><label className="text-xs text-gray-500">Comments</label><textarea value={fr.comments} onChange={(e) => handleFailedRoundChange(index, 'comments', e.target.value)} rows={1} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md"></textarea></div>
            <div className="md:col-span-1 flex items-end h-full"><Button onClick={() => removeFailedRound(index)} variant="ghost" size="sm" className="text-red-500 self-end"><Trash2 size={16} /></Button></div>
          </div>
        ))}
        <Button onClick={addFailedRound} variant="outline" size="sm" leftIcon={Plus}>Add Failed Round</Button>
      </div>

      <div className="border-b pb-6"><label htmlFor="totalReturns" className="block text-sm font-medium text-gray-700 mb-1">Total Returns (Edmonton DU)</label><input type="number" id="totalReturns" value={totalReturns} onChange={(e) => setTotalReturns(Number(e.target.value))} min="0" className="block w-full md:w-1/2 p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" /></div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Segregated Parcels Not Taken ({segregatedParcelsData.filter(sp => sp.barcode.trim()).length})</h3>
        {segregatedParcelsData.map((sp, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3 p-3 border rounded-md bg-gray-50 items-start">
            <div className="md:col-span-4"><label className="text-xs text-gray-500">Barcode</label><input type="text" value={sp.barcode} onChange={(e) => handleSegregatedParcelChange(index, 'barcode', e.target.value)} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md" /></div>
            <div className="md:col-span-4"><label className="text-xs text-gray-500">Client</label><select value={sp.client} onChange={(e) => handleSegregatedParcelChange(index, 'client', e.target.value)} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md"><option value="">-- Select Client --</option>{clients.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div>
            <div className="md:col-span-3"><label className="text-xs text-gray-500">Count</label><input type="number" value={sp.count} onChange={(e) => handleSegregatedParcelChange(index, 'count', Number(e.target.value))} min="1" className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md" /></div>
            <div className="md:col-span-1 flex items-end h-full"><Button onClick={() => removeSegregatedParcel(index)} variant="ghost" size="sm" className="text-red-500 self-end"><Trash2 size={16} /></Button></div>
          </div>
        ))}
        <Button onClick={addSegregatedParcel} variant="outline" size="sm" leftIcon={Plus}>Add Segregated Parcel</Button>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Missing Parcels Summary</h3>
        <Button onClick={handleImportMissingParcels} variant="secondary" size="sm" className="mb-3">Import Missing Parcels for {new Date(reportDate + 'T00:00:00Z').toLocaleDateString('en-GB')}</Button>
        {importedMissingSummary && (<div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm"><p><strong>Total Missing:</strong> {importedMissingSummary.total_missing}</p><p><strong>Unrecovered:</strong> {importedMissingSummary.unrecovered}</p><p><strong>Recovery Rate:</strong> {importedMissingSummary.recovery_rate}%</p>{importedMissingSummary.parcels.length > 0 && (<details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-600">Show Details ({importedMissingSummary.parcels.length})</summary><ul className="list-disc pl-5 mt-1 max-h-40 overflow-y-auto">{importedMissingSummary.parcels.map(p => ( <li key={p.scan_entry_id}>{p.barcode} (R{p.round_id}, C{p.courier_id}) - {p.recovered ? '✅ Recovered' : '❌ Missing'}</li> ))}</ul></details>)}</div>)}
      </div>

      <div className="border-b pb-6"><label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">General Notes</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea></div>

      <div className="flex justify-end gap-3">
        <Button onClick={handlePreviewEmail} variant="outline" leftIcon={Eye} disabled={!existingReportForDate && !formSuccess}>Preview Email</Button>
        <Button onClick={handleSendEmail} variant="outline" leftIcon={Send} disabled={!existingReportForDate && !formSuccess} className="text-green-600 border-green-500 hover:bg-green-50">Send Email</Button>
        <Button onClick={handleSubmitReport} variant="primary" leftIcon={FileText} disabled={!!existingReportForDate && formSuccess === `Loaded existing report for ${new Date(reportDate + 'T00:00:00Z').toLocaleDateString('en-GB')}. Submitted by ${existingReportForDate.submitted_by_name} at ${new Date(existingReportForDate.submitted_at).toLocaleTimeString()}.`}>{existingReportForDate ? 'Update Submitted Report' : 'Submit Report'}</Button>
      </div>

      <Modal isOpen={isEmailPreviewModalOpen} onClose={() => setIsEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="4xl">
        {emailPreviewContent && (<div className="prose max-w-none p-2 bg-white border rounded-md max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailPreviewContent.body }} />)}
         footer={<Button onClick={() => setIsEmailPreviewModalOpen(false)} variant="primary">Close Preview</Button>}
      </Modal>
    </div>
  );
};

export default DUCReportManager;
