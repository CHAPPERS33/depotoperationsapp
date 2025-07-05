
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { CageReturnReport, NonReturnedCageDetail } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Save, ArchiveX, CheckCircle, AlertTriangle, Eye, Send } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';
import { generateCageReturnReportEmail } from '../../utils/emailGenerators'; 

const CageReturnReportManager: React.FC = () => {
  const {
    subDepots,
    rounds,
    couriers,
    missingParcelsLog,
    cageReturnReports,
    addOrUpdateCageReturnReport,
    team 
  } = useSharedState();

  const [selectedDate, setSelectedDate] = useState<string>(TODAY_DATE_STRING);
  const [selectedSubDepotId, setSelectedSubDepotId] = useState<number | string>('');
  const [roundCourierPairs, setRoundCourierPairs] = useState<RoundCourierPair[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submittedByTeamMemberId, setSubmittedByTeamMemberId] = useState<string>(''); 
  
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);

  interface RoundCourierPair {
    roundId: string;
    courierId: string;
    courierName?: string;
    notReturned: boolean;
  }

  useEffect(() => {
    if (subDepots.length > 0 && !selectedSubDepotId) {
      setSelectedSubDepotId(subDepots[0].id);
    }
  }, [subDepots, selectedSubDepotId]);

  useEffect(() => {
    if (!selectedSubDepotId || !selectedDate) {
      setRoundCourierPairs([]);
      return;
    }

    const subDepotIdNum = Number(selectedSubDepotId);
    const roundsForSubDepot = rounds.filter(r => r.sub_depot_id === subDepotIdNum);
    const dateForLogFilter = new Date(selectedDate + "T00:00:00Z").toLocaleDateString('en-GB');

    const pairs: RoundCourierPair[] = [];
    roundsForSubDepot.forEach(round => {
      const logEntriesForRoundOnDate = missingParcelsLog.filter(
        log => log.dateAdded === dateForLogFilter && log.round_id === round.id && log.sub_depot_id === subDepotIdNum && log.courier_id
      );
      const uniqueCourierIds = [...new Set(logEntriesForRoundOnDate.map(log => log.courier_id!))];
      uniqueCourierIds.forEach(courierId => {
        const courierInfo = couriers.find(c => c.id === courierId);
        pairs.push({ roundId: round.id, courierId: courierId, courierName: courierInfo?.name || `ID: ${courierId}`, notReturned: false });
      });
    });
    
    const existingReport = cageReturnReports.find(r => r.date === selectedDate && r.sub_depot_id === subDepotIdNum);
    if (existingReport) {
      setRoundCourierPairs(pairs.map(p => ({ ...p, notReturned: existingReport.non_returned_cages.some(nrc => nrc.round_id === p.roundId && nrc.courier_id === p.courierId) })));
      setNotes(existingReport.notes || '');
      setSubmittedByTeamMemberId(existingReport.submitted_by_team_member_id || ''); 
      setFormSuccess(`Loaded existing report for ${new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-GB')}. Last submit: ${new Date(existingReport.submitted_at).toLocaleTimeString()}`);
    } else {
      setRoundCourierPairs(pairs);
      setNotes('');
      setSubmittedByTeamMemberId(''); 
      setFormSuccess(null);
    }
    setFormError(null);
  }, [selectedDate, selectedSubDepotId, rounds, missingParcelsLog, couriers, cageReturnReports]);

  const handleCheckboxChange = (roundId: string, courierId: string) => {
    setRoundCourierPairs(prevPairs => prevPairs.map(pair => pair.roundId === roundId && pair.courierId === courierId ? { ...pair, notReturned: !pair.notReturned } : pair ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!selectedDate || !selectedSubDepotId || !submittedByTeamMemberId.trim()) {
      setFormError('Date, Sub Depot, and "Submitted By" name are required.');
      return;
    }
    const nonReturnedEntries: NonReturnedCageDetail[] = roundCourierPairs
        .filter(pair => pair.notReturned)
        .map(pair => ({ 
            id: 0, // Placeholder, backend should assign
            cage_return_report_id: '', // Placeholder, backend should assign
            round_id: pair.roundId, 
            courier_id: pair.courierId, 
            courier_name: pair.courierName 
        }));

    const reportId = `${selectedDate}-${selectedSubDepotId}`;
    const existingReport = cageReturnReports.find(r => r.id === reportId);
    const report: Partial<CageReturnReport> = { 
        id: reportId, 
        date: selectedDate, 
        sub_depot_id: Number(selectedSubDepotId), 
        non_returned_cages: nonReturnedEntries, 
        notes: notes.trim() || undefined, 
        submitted_at: new Date().toISOString(), 
        submitted_by_team_member_id: submittedByTeamMemberId.trim() 
    };
    const result = await addOrUpdateCageReturnReport(report, !existingReport);
    if (result) {
        setFormSuccess('Cage Return Report saved successfully!');
    } else {
        setFormError('Failed to save Cage Return Report.');
    }
  };
  
  const handlePreviewEmail = () => {
    const reportToPreview = cageReturnReports.find(r => r.id === `${selectedDate}-${selectedSubDepotId}`);
    if (!reportToPreview) {
        alert("Report not saved for current selection. Please save the report first.");
        return;
    }
    const emailContent = generateCageReturnReportEmail(reportToPreview, subDepots);
    setEmailPreviewContent(emailContent);
    setEmailPreviewModalOpen(true);
  };

  const handleSendEmail = () => {
    const reportToSend = cageReturnReports.find(r => r.id === `${selectedDate}-${selectedSubDepotId}`);
    if (!reportToSend) {
        alert("Report not saved for current selection. Please save the report first.");
        return;
    }
    const emailContent = generateCageReturnReportEmail(reportToSend, subDepots);
    const mailtoLink = `mailto:reports@example.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("Please find the Cage Return Report attached or view below:\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`;
    alert("Attempting to open your email client. Please review and send. For full HTML, use the 'Preview Email' and copy content if needed. (Actual API email integration pending)");
    window.open(mailtoLink, '_blank');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center"><ArchiveX className="w-6 h-6 mr-2 text-orange-600" />Cage Return Report</h2>
        {formError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm flex items-center gap-2"><AlertTriangle size={18}/>{formError}</div>}
        {formSuccess && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm flex items-center gap-2"><CheckCircle size={18}/>{formSuccess}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="reportDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={TODAY_DATE_STRING} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required /></div>
          <div><label htmlFor="sub_depot_id" className="block text-sm font-medium text-gray-700">Sub Depot</label><select id="sub_depot_id" value={selectedSubDepotId} onChange={(e) => setSelectedSubDepotId(Number(e.target.value))} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required><option value="">-- Select Sub Depot --</option>{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div>
          <div><label htmlFor="submittedByTeamMemberId" className="block text-sm font-medium text-gray-700">Submitted By</label><input type="text" id="submittedByTeamMemberId" value={submittedByTeamMemberId} onChange={(e) => setSubmittedByTeamMemberId(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" placeholder="Your Name" required /></div>
        </div>
        {selectedSubDepotId && roundCourierPairs.length > 0 && (<div className="border-t pt-4"><h3 className="text-md font-semibold text-gray-700 mb-2">Rounds & Couriers for {subDepots.find(sd=>sd.id === Number(selectedSubDepotId))?.name} on {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-GB')}</h3><p className="text-xs text-gray-500 mb-3">Check the box if the courier did *not* return their cage(s).</p><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{roundCourierPairs.map(pair => (<div key={`${pair.roundId}-${pair.courierId}`} className="flex items-center justify-between p-3 border rounded-md bg-gray-50 hover:bg-gray-100"><div className="flex items-center"><input type="checkbox" id={`cb-${pair.roundId}-${pair.courierId}`} checked={pair.notReturned} onChange={() => handleCheckboxChange(pair.roundId, pair.courierId)} className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-3" /><label htmlFor={`cb-${pair.roundId}-${pair.courierId}`} className="text-sm text-gray-700">Round <span className="font-medium">{pair.roundId}</span> – Courier <span className="font-medium">{pair.courierName}</span></label></div>{pair.notReturned && <span className="text-xs text-red-600 font-semibold">Marked as Not Returned</span>}</div>))}</div></div>)}
        {selectedSubDepotId && roundCourierPairs.length === 0 && (<p className="text-gray-500 text-center py-4">No active rounds with couriers found for the selected sub-depot and date based on missing parcel logs.</p>)}
        <div className="border-t pt-4"><label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" placeholder="e.g., Reasons for non-return, specific cage numbers if known..."></textarea></div>
        <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={handlePreviewEmail} variant="outline" leftIcon={Eye} disabled={!cageReturnReports.find(r => r.id === `${selectedDate}-${selectedSubDepotId}`)}>Preview Email</Button>
            <Button type="button" onClick={handleSendEmail} variant="outline" leftIcon={Send} disabled={!cageReturnReports.find(r => r.id === `${selectedDate}-${selectedSubDepotId}`)} className="text-green-600 border-green-500 hover:bg-green-50">Send Email</Button>
            <Button type="submit" variant="primary" leftIcon={Save} size="lg">Save Report</Button>
        </div>
      </form>
      {cageReturnReports.length > 0 && (<div className="bg-white rounded-lg shadow p-6 mt-8"><h3 className="text-lg font-semibold mb-4 text-gray-800">Submitted Cage Return Reports (Recent First)</h3><div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr>{['Date', 'Sub Depot', '# Not Returned', 'Notes', 'Submitted By', 'Submitted At'].map(header => (<th key={header} className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>))}</tr></thead><tbody className="bg-white divide-y divide-gray-200">{cageReturnReports.map(report => (<tr key={report.id} className="hover:bg-gray-50"><td className="p-2 whitespace-nowrap">{new Date(report.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td><td className="p-2 whitespace-nowrap">{subDepots.find(sd => sd.id === report.sub_depot_id)?.name || report.sub_depot_id}</td><td className="p-2 text-center">{report.non_returned_cages.length}</td><td className="p-2 whitespace-nowrap max-w-xs truncate" title={report.notes || undefined}>{report.notes || '—'}</td><td className="p-2 whitespace-nowrap">{report.submitted_by_name || report.submitted_by_team_member_id}</td><td className="p-2 whitespace-nowrap">{new Date(report.submitted_at).toLocaleString('en-GB')}</td></tr>))}</tbody></table></div></div>)}
      
      <Modal isOpen={emailPreviewModalOpen} onClose={() => setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">
        {emailPreviewContent && (<div className="prose max-w-none p-2 bg-white border rounded-md max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailPreviewContent.body }} />)}
        footer={<Button onClick={() => setEmailPreviewModalOpen(false)} variant="primary">Close Preview</Button>}
      </Modal>
    </div>
  );
};

export default CageReturnReportManager;
