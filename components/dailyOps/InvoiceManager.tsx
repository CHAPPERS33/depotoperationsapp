// components/dailyOps/InvoiceManager.tsx
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Invoice, InvoiceLine, PayPeriod } from '../../types';
import { Plus, Trash2, Printer, CheckCircle2, DollarSign, AlertTriangle, FileText } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { generateInvoicePDFContent, printHtmlContent } from '../../utils/invoicePdfGenerator';
import { TODAY_DATE_STRING } from '../../constants';

const InvoiceManager: React.FC = () => {
  const { 
    invoices, // Using invoices for local state updates
    payPeriods, 
    team,
    workSchedules,
    subDepots,
    saveInvoice: apiSaveInvoice, // API function
    deleteInvoice: apiDeleteInvoice, // API function
    isLoadingInvoices: isLoadingInvoicesFromHook, // Loading state from hook
  } = useSharedState();

  const [isLoadingComponent, setIsLoadingComponent] = useState<boolean>(false); // For local form submissions
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
  
  const [showInvoiceViewModal, setShowInvoiceViewModal] = useState<boolean>(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [editableInvoiceLines, setEditableInvoiceLines] = useState<Partial<InvoiceLine>[]>([]); // Lines in modal can be partial before saving
  const [editingInvoiceNotes, setEditingInvoiceNotes] = useState<string>('');
  
  const [generateInvoicePayPeriodId, setGenerateInvoicePayPeriodId] = useState<string>('');
  const [generateInvoiceTeamMemberId, setGenerateInvoiceTeamMemberId] = useState<string>('');
  
  const [invoiceFilters] = useState<{
  payPeriodId: string | null;
  teamMemberId: string | null;
  status: string | null;
}>({
  payPeriodId: null,
  teamMemberId: null,
  status: null
});

  const [showInvoiceSuccessModal, setShowInvoiceSuccessModal] = useState<boolean>(false);
  const [invoiceSuccessMessage, setInvoiceSuccessMessage] = useState<string>('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');

  const filteredInvoices = invoices.filter(inv => {
    return (invoiceFilters.payPeriodId ? inv.pay_period_id === invoiceFilters.payPeriodId : true) &&
           (invoiceFilters.teamMemberId ? inv.team_member_id === invoiceFilters.teamMemberId : true) &&
           (invoiceFilters.status ? inv.status === invoiceFilters.status : true);
  }).sort((a,b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());


  const handleGenerateInvoiceRequest = () => {
    if (!generateInvoicePayPeriodId || !generateInvoiceTeamMemberId) {
      setInvoiceFormError("Please select both a Pay Period and a Team Member to generate an invoice.");
      return;
    }
    const teamMemberName = team.find(tm => tm.id === generateInvoiceTeamMemberId)?.name;
    const payPeriodInfo = payPeriods.find(pp => pp.id === generateInvoicePayPeriodId);
    const periodDisplay = payPeriodInfo ? `Period ${payPeriodInfo.period_number}/${payPeriodInfo.year}` : generateInvoicePayPeriodId;

    setConfirmationMessage(`Generate invoice for ${teamMemberName || 'Selected Team Member'} for ${periodDisplay}?\nThis will create a new Draft invoice based on work schedules for this period.`);
    setConfirmationAction(() => () => executeGenerateInvoice(teamMemberName, payPeriodInfo));
    setIsConfirmModalOpen(true);
  };
  
  const executeGenerateInvoice = async (teamMemberName: string | undefined, payPeriodInfo: PayPeriod | undefined) => {
    setInvoiceFormError(null);
    setIsLoadingComponent(true);

    const relevantSchedules = workSchedules.filter(ws => 
        ws.team_member_id === generateInvoiceTeamMemberId &&
        payPeriodInfo && 
        new Date(ws.date) >= new Date(payPeriodInfo.start_date) && 
        new Date(ws.date) <= new Date(payPeriodInfo.end_date) &&
        (ws.actual_hours || ws.scheduled_hours || 0) > 0 // Ensure hours is positive
    );

    const memberHourlyRate = team.find(tm => tm.id === generateInvoiceTeamMemberId)?.hourly_rate || 12.50;

    const newLines: Omit<InvoiceLine, 'id' | 'invoice_id'>[] = relevantSchedules.map(ws => {
        const hours = ws.actual_hours ?? ws.scheduled_hours ?? 0;
        return {
            date: ws.date,
            description: `Work performed on ${new Date(ws.date + 'T00:00:00Z').toLocaleDateString('en-GB')} - ${subDepots.find(sd => sd.id === ws.sub_depot_id)?.name || 'Sub ' + ws.sub_depot_id}`,
            hours: hours,
            rate: memberHourlyRate,
            amount: parseFloat((hours * memberHourlyRate).toFixed(2)),
            type: 'Regular',
            work_schedule_id: ws.id
        };
    });

    const totalHours = newLines.reduce((sum, line) => sum + line.hours, 0);
    const totalAmount = newLines.reduce((sum, line) => sum + line.amount, 0);

    const newInvoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        pay_period_id: generateInvoicePayPeriodId,
        team_member_id: generateInvoiceTeamMemberId,
        invoice_number: `DRAFT-${Date.now().toString().slice(-6)}`,
        invoice_date: TODAY_DATE_STRING,
        due_date: null,
        lines: newLines as InvoiceLine[], // Assuming API will assign IDs
        total_hours: totalHours,
        total_amount: totalAmount,
        status: 'Draft',
        team_member_name: teamMemberName,
        pay_period_info: payPeriodInfo ? `Period ${payPeriodInfo.period_number}/${payPeriodInfo.year}` : generateInvoicePayPeriodId,
    };
    
    // Construct FormData for API
    const formData = new FormData();
    Object.entries(newInvoiceData).forEach(([key, value]) => {
        if (key === 'lines') {
            formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
        }
    });

    const savedInvoice = await apiSaveInvoice(formData, true);

    if (savedInvoice) {
      setInvoiceSuccessMessage(`✅ Invoice ${savedInvoice.invoice_number || savedInvoice.id} generated successfully!\n\n💰 Total: £${savedInvoice.total_amount.toFixed(2)} (${savedInvoice.total_hours.toFixed(2)}h)\n📋 Status: Draft`);
      setShowInvoiceSuccessModal(true);
      setGenerateInvoicePayPeriodId('');
      setGenerateInvoiceTeamMemberId('');
    } else {
      setInvoiceFormError("Failed to generate invoice. Check API logs.");
    }
    setIsLoadingComponent(false);
  };

  const handleUpdateInvoiceStatusRequest = (invoiceId: string, newStatus: Invoice['status'], invoiceNumber?: string | null) => {
    const actionText = { 
  Draft: 'mark as Draft', 
  Sent: 'mark as Sent', 
  Paid: 'mark as Paid', 
  Void: 'void',
  Overdue: 'mark as Overdue' // Add this line
}[newStatus] || `change to ${newStatus}`;
    setConfirmationMessage(`Are you sure you want to ${actionText} invoice ${invoiceNumber || invoiceId.slice(-6)}?`);
    setConfirmationAction(() => () => executeUpdateInvoiceStatus(invoiceId, newStatus, invoiceNumber));
    setIsConfirmModalOpen(true);
  };

  const executeUpdateInvoiceStatus = async (invoiceId: string, newStatus: Invoice['status'], invoiceNumber?: string | null) => {
    setIsLoadingComponent(true);
    const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
    if (!invoiceToUpdate) {
        setInvoiceFormError("Invoice not found for status update.");
        setIsLoadingComponent(false);
        return;
    }
    const formData = new FormData();
    Object.entries({...invoiceToUpdate, status: newStatus, paid_date: newStatus === 'Paid' ? TODAY_DATE_STRING : invoiceToUpdate.paid_date}).forEach(([key, value]) => {
        if (key === 'lines') formData.append(key, JSON.stringify(value));
        else if (value !== null && value !== undefined) formData.append(key, String(value));
    });

    const updatedInvoice = await apiSaveInvoice(formData, false, invoiceId);

    if (updatedInvoice) {
      setInvoiceSuccessMessage(`✅ Invoice ${invoiceNumber || invoiceId.slice(-6)} status updated to ${newStatus}!`);
      setShowInvoiceSuccessModal(true);
      if (selectedInvoiceForView?.id === invoiceId) {
        setSelectedInvoiceForView(updatedInvoice);
      }
    } else {
      setInvoiceFormError("Failed to update invoice status.");
    }
    setIsLoadingComponent(false);
  };


  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForView(invoice);
    setEditableInvoiceLines([...invoice.lines.map(line => ({...line}))]); // Ensure deep copy for editing
    setEditingInvoiceNotes(invoice.notes || '');
    setInvoiceFormError(null);
    setShowInvoiceViewModal(true);
  };

  const handleDeleteInvoiceRequest = (invoiceId: string, invoiceNumber?: string | null) => {
     setConfirmationMessage(`Are you sure you want to delete invoice ${invoiceNumber || invoiceId.slice(-6)}? This action cannot be undone.`);
     setConfirmationAction(() => () => executeDeleteInvoice(invoiceId));
     setIsConfirmModalOpen(true);
  };

  const executeDeleteInvoice = async (invoiceId: string) => {
     setIsLoadingComponent(true);
     const success = await apiDeleteInvoice(invoiceId);
     if (success) {
        setInvoiceSuccessMessage('Invoice deleted successfully.');
        setShowInvoiceSuccessModal(true);
        if(selectedInvoiceForView?.id === invoiceId) setShowInvoiceViewModal(false);
     } else {
        setInvoiceFormError("Failed to delete invoice.");
     }
     setIsLoadingComponent(false);
  };

  const handleInvoiceLineChange = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...editableInvoiceLines];
    const lineToUpdate = { ...newLines[index] } as Partial<InvoiceLine>; // Cast to allow partial update
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (field === 'hours' || field === 'rate') {
      (lineToUpdate as any)[field] = isNaN(numValue) ? 0 : numValue;
    } else {
      (lineToUpdate as any)[field] = value;
    }
    lineToUpdate.amount = parseFloat(((Number(lineToUpdate.hours) || 0) * (Number(lineToUpdate.rate) || 0)).toFixed(2));
    newLines[index] = lineToUpdate;
    setEditableInvoiceLines(newLines);
  };
  
  const addInvoiceLine = () => {
    const memberHourlyRate = team.find(tm => tm.id === selectedInvoiceForView?.team_member_id)?.hourly_rate || 12.50;
    setEditableInvoiceLines(prev => [...prev, { date: TODAY_DATE_STRING, description: '', hours: 0, rate: memberHourlyRate, amount: 0, type: 'Regular' }]);
  };

  const removeInvoiceLine = (index: number) => {
    setEditableInvoiceLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoiceEdits = async () => {
    if (!selectedInvoiceForView) return;
    setInvoiceFormError(null);
    setIsLoadingComponent(true);
    const totalHours = editableInvoiceLines.reduce((sum, l) => sum + Number(l.hours || 0), 0);
    const totalAmount = editableInvoiceLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    const updatedInvoiceData: Partial<Invoice> = {
      ...selectedInvoiceForView,
      notes: editingInvoiceNotes,
      lines: editableInvoiceLines.map(line => ({
        id: line.id, // Keep ID if it exists (for existing lines)
        invoice_id: selectedInvoiceForView.id, // Ensure invoice_id is set
        date: line.date!,
        description: line.description!, 
        hours: Number(line.hours) || 0, 
        rate: Number(line.rate) || 0, 
        amount: parseFloat(((Number(line.hours) || 0) * (Number(line.rate) || 0)).toFixed(2)),
        type: line.type!,
        work_schedule_id: line.work_schedule_id
    })),
      total_hours: totalHours,
      total_amount: totalAmount,
    };
    
    const formData = new FormData();
    Object.entries(updatedInvoiceData).forEach(([key, value]) => {
        if (key === 'lines') formData.append(key, JSON.stringify(value));
        else if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    
    const savedInvoice = await apiSaveInvoice(formData, false, selectedInvoiceForView.id);
    
    if (savedInvoice) {
      setSelectedInvoiceForView(savedInvoice); 
      setInvoiceSuccessMessage("✅ Invoice draft updated successfully!");
      setShowInvoiceSuccessModal(true);
    } else {
      setInvoiceFormError("Failed to update invoice draft.");
    }
    setIsLoadingComponent(false);
  };


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Manage Invoices</h2>
        
        <div className="mb-8 p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
          <h3 className="text-lg font-semibold text-indigo-700 mb-3">Generate New Draft Invoice</h3>
          {invoiceFormError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-3">{invoiceFormError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div><label htmlFor="genInvPayPeriod" className="block text-sm font-medium text-gray-700">Pay Period</label><select id="genInvPayPeriod" value={generateInvoicePayPeriodId} onChange={(e) => setGenerateInvoicePayPeriodId(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"><option value="">-- Select --</option>{payPeriods.sort((a,b) => { if(a.year !== b.year) return b.year - a.year; return b.period_number - a.period_number; }).map(pp => (<option key={pp.id} value={pp.id}>{pp.period_number}/{pp.year} ({new Date(pp.start_date+'T00:00:00Z').toLocaleDateString('en-GB')})</option>))}</select></div>
            <div><label htmlFor="genInvTeamMember" className="block text-sm font-medium text-gray-700">Team Member</label><select id="genInvTeamMember" value={generateInvoiceTeamMemberId} onChange={(e) => setGenerateInvoiceTeamMemberId(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"><option value="">-- Select --</option>{team.sort((a,b) => a.name.localeCompare(b.name)).map(tm => (<option key={tm.id} value={tm.id}>{tm.name} ({tm.id})</option>))}</select></div>
            <Button onClick={handleGenerateInvoiceRequest} variant="primary" disabled={isLoadingComponent && !!(generateInvoicePayPeriodId && generateInvoiceTeamMemberId)} leftIcon={Plus}>
              {isLoadingComponent && generateInvoicePayPeriodId && generateInvoiceTeamMemberId ? 'Generating...' : 'Generate Draft'}
            </Button>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-3">Existing Invoices</h3>
        {isLoadingInvoicesFromHook && !(generateInvoicePayPeriodId && generateInvoiceTeamMemberId) && <p className="text-center py-4">Loading invoices...</p>}
        {!isLoadingInvoicesFromHook && filteredInvoices.length === 0 && <p className="text-gray-500 text-center py-4">No invoices found. Try generating one or adjusting filters.</p>}
        {!isLoadingInvoicesFromHook && filteredInvoices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr>{['Invoice #', 'Date', 'Team Member', 'Pay Period', 'Total Amt.', 'Status', 'Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{inv.invoice_number || inv.id.slice(-6)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{new Date(inv.invoice_date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{inv.team_member_name || team.find(t=>t.id === inv.team_member_id)?.name || inv.team_member_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{inv.pay_period_info || payPeriods.find(p=>p.id === inv.pay_period_id)?.period_number + '/' + payPeriods.find(p=>p.id === inv.pay_period_id)?.year || inv.pay_period_id.slice(-6)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-right">£{inv.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-center"><span className={`px-2 py-1 text-xs rounded-full font-medium ${inv.status === 'Draft' ? 'bg-gray-200 text-gray-700' : inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' : inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Void' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-sm space-x-1 whitespace-nowrap">
                      <Button onClick={() => handleViewInvoice(inv)} variant="ghost" size="sm" title="View/Edit Details"><FileText size={16}/></Button>
                      <Button onClick={() => printHtmlContent(generateInvoicePDFContent(inv, team.find(t=>t.id===inv.team_member_id), payPeriods.find(p=>p.id===inv.pay_period_id)), `Invoice-${inv.invoice_number || inv.id}`)} variant="ghost" size="sm" title="Print/Export PDF" className="text-purple-600 hover:text-purple-700"><Printer size={16}/></Button>
                      {inv.status === 'Draft' && (<Button onClick={() => handleUpdateInvoiceStatusRequest(inv.id, 'Sent', inv.invoice_number)} variant="ghost" size="sm" title="Mark as Sent" className="text-blue-600 hover:text-blue-700"><CheckCircle2 size={16}/></Button>)}
                      {inv.status === 'Sent' && (<Button onClick={() => handleUpdateInvoiceStatusRequest(inv.id, 'Paid', inv.invoice_number)} variant="ghost" size="sm" title="Mark as Paid" className="text-green-600 hover:text-green-700"><DollarSign size={16}/></Button>)}
                      {inv.status === 'Draft' && (<Button onClick={() => handleDeleteInvoiceRequest(inv.id, inv.invoice_number)} variant="ghost" size="sm" title="Delete Draft" className="text-red-600 hover:text-red-700"><Trash2 size={16}/></Button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showInvoiceViewModal && !!selectedInvoiceForView} onClose={() => setShowInvoiceViewModal(false)} title={`Invoice: ${selectedInvoiceForView?.invoice_number || selectedInvoiceForView?.id.slice(-8)}`} size="3xl">
        {selectedInvoiceForView && (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">For: {selectedInvoiceForView.team_member_name || team.find(t=>t.id === selectedInvoiceForView.team_member_id)?.name}</p>
                <p className="text-sm text-gray-500">Period: {selectedInvoiceForView.pay_period_info || payPeriods.find(p=>p.id === selectedInvoiceForView.pay_period_id)?.period_number + '/' + payPeriods.find(p=>p.id === selectedInvoiceForView.pay_period_id)?.year}</p>
                <p className="text-sm text-gray-500">Date: {new Date(selectedInvoiceForView.invoice_date + 'T00:00:00Z').toLocaleDateString('en-GB')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => printHtmlContent(generateInvoicePDFContent(selectedInvoiceForView, team.find(t=>t.id===selectedInvoiceForView.team_member_id), payPeriods.find(p=>p.id===selectedInvoiceForView.pay_period_id)), `Invoice-${selectedInvoiceForView.invoice_number || selectedInvoiceForView.id}`)} variant="secondary" size="sm" leftIcon={Printer}>Print</Button>
                <span className={`px-3 py-1 text-sm rounded-full font-semibold ${selectedInvoiceForView.status === 'Draft' ? 'bg-gray-200 text-gray-800' : selectedInvoiceForView.status === 'Sent' ? 'bg-blue-100 text-blue-800' : selectedInvoiceForView.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedInvoiceForView.status}</span>
              </div>
            </div>
            {invoiceFormError && selectedInvoiceForView.status === 'Draft' && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-3">{invoiceFormError}</p>}
            <h4 className="text-md font-semibold pt-2 text-gray-700 mb-2">Invoice Lines:</h4>
            {editableInvoiceLines.length > 0 ? (
              <div className="overflow-x-auto border rounded-md max-h-96">
                <table className="w-full min-w-full text-sm"><thead className="bg-gray-100 sticky top-0 z-10"><tr>{['Date', 'Description', 'Hours', 'Rate', 'Amount', 'Type', selectedInvoiceForView.status === 'Draft' ? '' : undefined].filter(Boolean).map(h=><th key={h as string} className="p-2 text-left font-medium text-gray-600">{h as string}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {editableInvoiceLines.map((line, index) => (
                      <tr key={line.id || `newline-${index}`}>
                        {selectedInvoiceForView.status === 'Draft' ? ( <>
                            <td className="p-1"><input type="date" value={line.date} onChange={(e) => handleInvoiceLineChange(index, 'date', e.target.value)} className="border-gray-300 rounded-md px-2 py-1 w-full text-xs"/></td>
                            <td className="p-1"><input type="text" value={line.description} onChange={(e) => handleInvoiceLineChange(index, 'description', e.target.value)} className="border-gray-300 rounded-md px-2 py-1 w-full text-xs"/></td>
                            <td className="p-1"><input type="number" value={line.hours || ''} onChange={(e) => handleInvoiceLineChange(index, 'hours', e.target.value)} className="border-gray-300 rounded-md px-2 py-1 w-20 text-right text-xs" step="0.1"/></td>
                            <td className="p-1"><input type="number" value={line.rate || ''} onChange={(e) => handleInvoiceLineChange(index, 'rate', e.target.value)} className="border-gray-300 rounded-md px-2 py-1 w-20 text-right text-xs" step="0.01"/></td>
                            <td className="p-1 text-right whitespace-nowrap">£{(Number(line.amount) || 0).toFixed(2)}</td>
                            <td className="p-1"><select value={line.type} onChange={(e) => handleInvoiceLineChange(index, 'type', e.target.value as InvoiceLine['type'])} className="border-gray-300 rounded-md px-2 py-1 w-full text-xs"><option value="Regular">Regular</option><option value="Overtime">Overtime</option><option value="Adjustment">Adjustment</option><option value="Bonus">Bonus</option><option value="Expense">Expense</option><option value="Standby">Standby</option></select></td>
                            <td className="p-1 text-center"><Button type="button" onClick={() => removeInvoiceLine(index)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700"><Trash2 size={14}/></Button></td>
                          </>
                        ) : ( <>
                            <td className="p-2 whitespace-nowrap">{new Date(line.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td><td className="p-2">{line.description}</td><td className="p-2 text-right whitespace-nowrap">{(Number(line.hours)||0).toFixed(2)}</td><td className="p-2 text-right whitespace-nowrap">£{(Number(line.rate)||0).toFixed(2)}</td><td className="p-2 text-right whitespace-nowrap">£{(Number(line.amount)||0).toFixed(2)}</td><td className="p-2 whitespace-nowrap">{line.type}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedInvoiceForView.status === 'Draft' && (<Button type="button" onClick={addInvoiceLine} variant="outline" size="sm" leftIcon={Plus} className="m-2">Add Line</Button>)}
              </div>
            ) : <p className="text-gray-500">No line items for this invoice.</p>}
            {selectedInvoiceForView.status === 'Draft' && (<div><label htmlFor="invoice-notes" className="block text-sm font-medium text-gray-700 mt-3">Invoice Notes:</label><textarea id="invoice-notes" value={editingInvoiceNotes} onChange={(e) => setEditingInvoiceNotes(e.target.value)} rows={2} className="mt-1 border-gray-300 rounded-md shadow-sm px-3 py-2 w-full"></textarea></div>)}
            <div className="text-right mt-4 pt-4 border-t">
              <p className="text-gray-600">Total Hours: <span className="font-semibold">{editableInvoiceLines.reduce((sum, l) => sum + Number(l.hours || 0), 0).toFixed(2)}</span></p>
              <p className="text-xl font-bold text-gray-800">Total Amount: <span className="text-indigo-600">£{editableInvoiceLines.reduce((sum, l) => sum + Number(l.amount || 0), 0).toFixed(2)}</span></p>
            </div>
            {selectedInvoiceForView.notes && selectedInvoiceForView.status !== 'Draft' && <div className="pt-2"><p className="text-sm text-gray-600"><strong>Notes:</strong> {selectedInvoiceForView.notes}</p></div>}
            {selectedInvoiceForView.paid_date && <div className="pt-1"><p className="text-sm text-green-600"><strong>Paid on:</strong> {new Date(selectedInvoiceForView.paid_date + 'T00:00:00Z').toLocaleDateString('en-GB')}</p></div>}
          </>
        )}
        footer={selectedInvoiceForView && (
          <>
            {selectedInvoiceForView.status === 'Draft' && (<Button variant="primary" onClick={handleSaveInvoiceEdits} isLoading={isLoadingComponent}>Save Draft Changes</Button>)}
            <Button variant="outline" onClick={() => setShowInvoiceViewModal(false)}>Close</Button>
          </>
        )}
      </Modal>
      
      <Modal isOpen={showInvoiceSuccessModal} onClose={() => setShowInvoiceSuccessModal(false)} title="Success!" size="md">
          <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 whitespace-pre-line">{invoiceSuccessMessage}</p>
          </div>
          footer={
              <Button onClick={() => setShowInvoiceSuccessModal(false)} variant="primary" className="w-full">Continue</Button>
          }
      </Modal>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Action" size="sm">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <p className="mt-4 text-gray-700 whitespace-pre-line">{confirmationMessage}</p>
        </div>
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { if (confirmationAction) confirmationAction(); setIsConfirmModalOpen(false); }} isLoading={isLoadingComponent}>Confirm</Button>
          </div>
        }
      </Modal>

    </div>
  );
};

export default InvoiceManager;