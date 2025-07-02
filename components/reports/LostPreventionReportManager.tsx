
// components/reports/LostPreventionReportManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { LostPreventionReport, Courier, Round } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Save, Trash2, Edit, Eye, AlertTriangle, Camera, Search, Send } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';
import { generateLostPreventionReportEmail } from '../../utils/emailGenerators'; 

const MAX_ROUNDS_PER_REPORT = 5;

const LostPreventionReportManager: React.FC = () => {
  const {
    lostPreventionReports,
    saveLostPreventionReport, 
    deleteLostPreventionReport,
    couriers,
    rounds,
    team, 
  } = useSharedState();

  const initialFormState: Partial<Omit<LostPreventionReport, 'id' | 'submitted_at' | 'created_at' | 'updated_at' | 'submitted_by_name' | 'courier_name' | 'attachments' >> & { tempRoundId?: string, cctvFile?: File | null, vanSearchFile?: File | null } = {
    date_of_incident: TODAY_DATE_STRING, submitted_by_team_member_id: '', courier_id: '', round_ids: [], incident_description: '',
    cctv_viewed: false, cctv_details: '', cctvFile: null, cctvFileName: '',
    van_search_conducted: false, van_search_findings: '', vanSearchFile: null, vanSearchFileName: '',
    comments: '', tempRoundId: '', status: 'Open'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [reportToView, setReportToView] = useState<LostPreventionReport | null>(null);
  const [cctvImagePreview, setCctvImagePreview] = useState<string | null>(null);
  const [vanSearchImagePreview, setVanSearchImagePreview] = useState<string | null>(null);
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleAddRoundId = () => { if (formData.tempRoundId && !formData.round_ids?.includes(formData.tempRoundId) && (formData.round_ids?.length || 0) < MAX_ROUNDS_PER_REPORT) { setFormData(prev => ({ ...prev, round_ids: [...(prev.round_ids || []), prev.tempRoundId!], tempRoundId: '' })); } else if ((formData.round_ids?.length || 0) >= MAX_ROUNDS_PER_REPORT) { alert(`Maximum ${MAX_ROUNDS_PER_REPORT} rounds can be added.`); } };
  const handleRemoveRoundId = (roundIdToRemove: string) => { setFormData(prev => ({ ...prev, round_ids: (prev.round_ids || []).filter(id => id !== roundIdToRemove) })); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'cctv' | 'vanSearch') => {
    const file = e.target.files?.[0];
    if (file) { 
        const reader = new FileReader(); 
        reader.onloadend = () => { 
            const dataUrl = reader.result as string; 
            if (fileType === 'cctv') { 
                setFormData(prev => ({ ...prev, cctvFile: file, cctvFileName: file.name })); 
                setCctvImagePreview(file.type.startsWith('image/') ? dataUrl : null); 
            } else { 
                setFormData(prev => ({ ...prev, vanSearchFile: file, vanSearchFileName: file.name })); 
                setVanSearchImagePreview(file.type.startsWith('image/') ? dataUrl : null); 
            } 
        }; 
        reader.readAsDataURL(file); 
    } 
    e.target.value = ''; 
  };
  const removeFile = (fileType: 'cctv' | 'vanSearch') => { if (fileType === 'cctv') { setFormData(prev => ({...prev, cctvFile: null, cctvFileName: ''})); setCctvImagePreview(null); } else { setFormData(prev => ({...prev, vanSearchFile: null, vanSearchFileName: ''})); setVanSearchImagePreview(null); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setFormSuccess(null);
    if (!formData.date_of_incident || !formData.submitted_by_team_member_id?.trim() || !formData.courier_id || formData.round_ids?.length === 0 || !formData.incident_description?.trim()) { setFormError('Date, Submitted By, Courier, at least one Round, and Incident Description are required.'); return; }
    
    const formDataInstance = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
        if (key === 'cctvFile' && value instanceof File) formDataInstance.append('cctvFile', value);
        else if (key === 'vanSearchFile' && value instanceof File) formDataInstance.append('vanSearchFile', value);
        else if (key === 'round_ids' && Array.isArray(value)) formDataInstance.append(key, JSON.stringify(value));
        else if (value !== undefined && value !== null && value !== '') formDataInstance.append(key, String(value));
    });
    
    let result;
    if (editingReportId) {
        result = await saveLostPreventionReport(formDataInstance, false, editingReportId);
    } else {
        result = await saveLostPreventionReport(formDataInstance, true);
    }

    if (result) { 
        setFormSuccess(editingReportId ? 'Report updated successfully!' : 'Lost Prevention Report submitted successfully!'); 
        setFormData(initialFormState); 
        setCctvImagePreview(null); 
        setVanSearchImagePreview(null); 
        setEditingReportId(null);
    } else {
        setFormError('Failed to save report. Check API logs.');
    }
  };
  
  const handleEditReport = (report: LostPreventionReport) => { 
    setEditingReportId(report.id); 
    setFormData({ 
      date_of_incident: report.date_of_incident,
      submitted_by_team_member_id: report.submitted_by_team_member_id,
      courier_id: report.courier_id,
      round_ids: [...report.round_ids], 
      incident_description: report.incident_description,
      cctv_viewed: report.cctv_viewed,
      cctv_details: report.cctv_details || '',
      cctvFile: null, 
      cctvFileName: report.attachments?.find(a => a.description === 'CCTV footage')?.file_name || '',
      van_search_conducted: report.van_search_conducted,
      van_search_findings: report.van_search_findings || '',
      vanSearchFile: null,
      vanSearchFileName: report.attachments?.find(a => a.description === 'Van search photo')?.file_name || '',
      comments: report.comments || '',
      status: report.status,
      tempRoundId: '' 
    }); 
    setCctvImagePreview(report.attachments?.find(a=>a.description==='CCTV footage' && a.public_url.startsWith('data:image/'))?.public_url || null); 
    setVanSearchImagePreview(report.attachments?.find(a=>a.description==='Van search photo' && a.public_url.startsWith('data:image/'))?.public_url || null); 
    setFormError(null); setFormSuccess(null); window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const handleDeleteReport = async (reportId: string) => { if (window.confirm('Are you sure you want to delete this report?')) { const success = await deleteLostPreventionReport(reportId); if(success) setFormSuccess('Report deleted.'); else setFormError('Failed to delete report.')} };
  const handleViewReport = (report: LostPreventionReport) => { setReportToView(report); setViewModalOpen(true); };
  
  const handlePreviewEmail = (report: LostPreventionReport) => {
    const emailContent = generateLostPreventionReportEmail(report);
    setEmailPreviewContent(emailContent);
    setEmailPreviewModalOpen(true);
  };

  const handleSendEmail = (report: LostPreventionReport) => {
    const emailContent = generateLostPreventionReportEmail(report);
    const mailtoLink = `mailto:security@example.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent("Please find the Lost Prevention Report attached or view below:\n\n--- HTML PREVIEW (best viewed in HTML-compatible client) ---\n\n" + emailContent.body.replace(/<style([\S\s]*?)<\/style>/gi, '').replace(/<[^>]+>/g, '\n'))}`;
    alert("Attempting to open your email client. Please review and send. (Actual API email integration pending)");
    window.open(mailtoLink, '_blank');
  };


  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4"><h2 className="text-xl font-semibold text-gray-800 flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-pink-600" />{editingReportId ? 'Edit Lost Prevention Report' : 'Log New Lost Prevention Report'}</h2>{editingReportId && (<Button variant="outline" onClick={() => { setEditingReportId(null); setFormData(initialFormState); setCctvImagePreview(null); setVanSearchImagePreview(null); }} size="sm">Cancel Edit</Button>)}</div>
        {formError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">{formError}</div>}
        {formSuccess && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm">{formSuccess}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label htmlFor="date_of_incident" className="block text-sm font-medium text-gray-700">Date of Incident</label><input type="date" name="date_of_incident" id="date_of_incident" value={formData.date_of_incident} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required /></div>
          <div><label htmlFor="submitted_by_team_member_id" className="block text-sm font-medium text-gray-700">Submitted By</label><input type="text" name="submitted_by_team_member_id" id="submitted_by_team_member_id" value={formData.submitted_by_team_member_id} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required /></div>
          <div><label htmlFor="courier_id" className="block text-sm font-medium text-gray-700">Courier Involved</label><select name="courier_id" id="courier_id" value={formData.courier_id} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required><option value="">-- Select Courier --</option>{couriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700">Round(s) Involved (Max {MAX_ROUNDS_PER_REPORT})</label><div className="flex gap-2 mt-1 items-center"><select name="tempRoundId" value={formData.tempRoundId} onChange={handleInputChange} className="flex-grow p-2 border-gray-300 rounded-md shadow-sm"><option value="">-- Select a Round --</option>{rounds.map(r => <option key={r.id} value={r.id}>R{r.id} (Sub {r.sub_depot_id})</option>)}</select><Button type="button" onClick={handleAddRoundId} variant="secondary" size="sm" disabled={(formData.round_ids?.length || 0) >= MAX_ROUNDS_PER_REPORT}>Add</Button></div>{formData.round_ids && formData.round_ids.length > 0 && (<div className="mt-2 flex flex-wrap gap-2">{formData.round_ids.map(rid => (<span key={rid} className="flex items-center bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">Round {rid}<button type="button" onClick={() => handleRemoveRoundId(rid)} className="ml-1.5 text-blue-500 hover:text-blue-700"><Trash2 size={12}/></button></span>))}</div>)}</div>
        <div><label htmlFor="incident_description" className="block text-sm font-medium text-gray-700">Incident Description</label><textarea name="incident_description" id="incident_description" value={formData.incident_description} onChange={handleInputChange} rows={4} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required /></div>
        <div className="space-y-4 border-t pt-4"><div className="flex items-center"><input type="checkbox" name="cctv_viewed" id="cctv_viewed" checked={formData.cctv_viewed} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" /><label htmlFor="cctv_viewed" className="ml-2 block text-sm font-medium text-gray-900">CCTV Viewed?</label></div>{formData.cctv_viewed && (<div className="pl-6 space-y-3"><div><label htmlFor="cctv_details" className="text-xs font-medium text-gray-600">CCTV Details</label><textarea name="cctv_details" id="cctv_details" value={formData.cctv_details} onChange={handleInputChange} rows={2} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md"/></div><div><label htmlFor="cctvFile" className="text-xs font-medium text-gray-600">Upload CCTV Snapshot/File</label><input type="file" name="cctvFile" id="cctvFile" onChange={(e) => handleFileUpload(e, 'cctv')} className="mt-1 block w-full text-xs"/>{cctvImagePreview && <img src={cctvImagePreview} alt="CCTV Preview" className="mt-2 max-h-32 rounded border"/>}{formData.cctvFileName && <p className="text-xs text-gray-500 mt-1">File: {formData.cctvFileName} {formData.cctvFile && <button type="button" onClick={()=>removeFile('cctv')} className="text-red-500 text-xs ml-2">Remove</button>}</p>}</div></div>)}</div>
        <div className="space-y-4 border-t pt-4"><div className="flex items-center"><input type="checkbox" name="van_search_conducted" id="van_search_conducted" checked={formData.van_search_conducted} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" /><label htmlFor="van_search_conducted" className="ml-2 block text-sm font-medium text-gray-900">Van Search Conducted?</label></div>{formData.van_search_conducted && (<div className="pl-6 space-y-3"><div><label htmlFor="van_search_findings" className="text-xs font-medium text-gray-600">Van Search Findings</label><textarea name="van_search_findings" id="van_search_findings" value={formData.van_search_findings} onChange={handleInputChange} rows={2} className="mt-1 block w-full p-1.5 text-sm border-gray-300 rounded-md"/></div><div><label htmlFor="vanSearchFile" className="text-xs font-medium text-gray-600">Upload Van Search Photo/File</label><input type="file" name="vanSearchFile" id="vanSearchFile" onChange={(e) => handleFileUpload(e, 'vanSearch')} className="mt-1 block w-full text-xs"/>{vanSearchImagePreview && <img src={vanSearchImagePreview} alt="Van Search Preview" className="mt-2 max-h-32 rounded border"/>}{formData.vanSearchFileName && <p className="text-xs text-gray-500 mt-1">File: {formData.vanSearchFileName} {formData.vanSearchFile && <button type="button" onClick={()=>removeFile('vanSearch')} className="text-red-500 text-xs ml-2">Remove</button>}</p>}</div></div>)}</div>
        <div><label htmlFor="comments" className="block text-sm font-medium text-gray-700">Additional Comments / Actions</label><textarea name="comments" id="comments" value={formData.comments} onChange={handleInputChange} rows={3} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/></div>
        <div className="flex justify-end pt-2"><Button type="submit" variant="primary" leftIcon={Save} size="lg">{editingReportId ? 'Update Report' : 'Submit Report'}</Button></div>
      </form>

      {lostPreventionReports.length > 0 && (<div className="bg-white rounded-lg shadow p-6 mt-8"><h3 className="text-lg font-semibold mb-4 text-gray-800">Submitted Lost Prevention Reports</h3><div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr>{['Date', 'Courier', 'Rounds', 'Incident (Snippet)', 'Submitted By', 'Actions'].map(h=><th key={h} className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead><tbody className="bg-white divide-y divide-gray-200">{lostPreventionReports.map(report => (<tr key={report.id} className="hover:bg-gray-50"><td className="p-2 whitespace-nowrap">{new Date(report.date_of_incident + 'T00:00:00Z').toLocaleDateString('en-GB')}</td><td className="p-2 whitespace-nowrap">{report.courier_name || report.courier_id}</td><td className="p-2 whitespace-nowrap text-xs">{report.round_ids.join(', ')}</td><td className="p-2 whitespace-nowrap max-w-xs truncate" title={report.incident_description}>{report.incident_description.substring(0, 50)}...</td><td className="p-2 whitespace-nowrap">{report.submitted_by_name || report.submitted_by_team_member_id}</td><td className="p-2 whitespace-nowrap space-x-1"><Button onClick={() => handleViewReport(report)} variant="ghost" size="sm" title="View Details"><Eye size={16}/></Button><Button onClick={() => handlePreviewEmail(report)} variant="ghost" size="sm" title="Preview Email"><Eye className="text-blue-500" size={16}/></Button><Button onClick={() => handleSendEmail(report)} variant="ghost" size="sm" title="Send Email" className="text-green-600"><Send size={16}/></Button><Button onClick={() => handleEditReport(report)} variant="ghost" size="sm" title="Edit Report"><Edit size={16}/></Button><Button onClick={() => handleDeleteReport(report.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700" title="Delete Report"><Trash2 size={16}/></Button></td></tr>))}</tbody></table></div></div>)}
      {reportToView && (<Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={`View Report: ${reportToView.id.slice(-6)} (${new Date(reportToView.date_of_incident+'T00:00:00Z').toLocaleDateString('en-GB')})`} size="2xl"><div className="space-y-3 text-sm"><p><strong>Submitted:</strong> {reportToView.submitted_by_name} at {new Date(reportToView.submitted_at).toLocaleString('en-GB')}</p><p><strong>Courier:</strong> {reportToView.courier_name} ({reportToView.courier_id})</p><p><strong>Rounds:</strong> {reportToView.round_ids.join(', ')}</p><p><strong>Incident:</strong><br/> <span className="whitespace-pre-line">{reportToView.incident_description}</span></p><hr className="my-2"/><p><strong>CCTV Viewed:</strong> {reportToView.cctv_viewed ? 'Yes' : 'No'}</p>{reportToView.cctv_viewed && (<><p><strong>CCTV Details:</strong><br/> <span className="whitespace-pre-line">{reportToView.cctv_details || 'N/A'}</span></p>{reportToView.attachments?.find(a=>a.description==='CCTV footage') && (reportToView.attachments.find(a=>a.description==='CCTV footage')!.public_url.startsWith('data:image/') ? <img src={reportToView.attachments.find(a=>a.description==='CCTV footage')!.public_url} alt="CCTV" className="max-h-48 rounded border my-1"/> : <a href={reportToView.attachments.find(a=>a.description==='CCTV footage')!.public_url} download={reportToView.attachments.find(a=>a.description==='CCTV footage')!.file_name} className="text-blue-600 hover:underline">Download {reportToView.attachments.find(a=>a.description==='CCTV footage')!.file_name}</a>)}</>)}<hr className="my-2"/><p><strong>Van Search Conducted:</strong> {reportToView.van_search_conducted ? 'Yes' : 'No'}</p>{reportToView.van_search_conducted && (<><p><strong>Van Search Findings:</strong><br/> <span className="whitespace-pre-line">{reportToView.van_search_findings || 'N/A'}</span></p>{reportToView.attachments?.find(a=>a.description==='Van search photo') && (reportToView.attachments.find(a=>a.description==='Van search photo')!.public_url.startsWith('data:image/') ? <img src={reportToView.attachments.find(a=>a.description==='Van search photo')!.public_url} alt="Van Search" className="max-h-48 rounded border my-1"/> : <a href={reportToView.attachments.find(a=>a.description==='Van search photo')!.public_url} download={reportToView.attachments.find(a=>a.description==='Van search photo')!.file_name} className="text-blue-600 hover:underline">Download {reportToView.attachments.find(a=>a.description==='Van search photo')!.file_name}</a>)}</>)}{reportToView.comments && (<><hr className="my-2"/><p><strong>Comments/Actions:</strong><br/> <span className="whitespace-pre-line">{reportToView.comments}</span></p></>)}</div>footer={<Button onClick={() => setViewModalOpen(false)} variant="primary">Close</Button>}</Modal>)}
      <Modal isOpen={emailPreviewModalOpen} onClose={() => setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">{emailPreviewContent && (<div className="prose max-w-none p-2 bg-white border rounded-md max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailPreviewContent.body }} />)}footer={<Button onClick={() => setEmailPreviewModalOpen(false)} variant="primary">Close Preview</Button>}</Modal>
    </div>
  );
};

export default LostPreventionReportManager;
