// components/dailyOps/InvoiceManager.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Invoice, InvoiceLine } from '../../types';
import { Plus, CheckCircle2 } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { TODAY_DATE_STRING } from '../../constants';

// Utility function
const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-GB');

const InvoiceManager: React.FC = () => {
  const {
    invoices,
    payPeriods,
    team,
    workSchedules,
    subDepots,
    saveInvoice: apiSaveInvoice,
    isLoadingInvoices: isLoadingInvoicesFromHook,
  } = useSharedState();

  const [isLoadingComponent, setIsLoadingComponent] = useState(false);
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
  const [generateInvoicePayPeriodId, setGenerateInvoicePayPeriodId] = useState('');
  const [generateInvoiceTeamMemberId, setGenerateInvoiceTeamMemberId] = useState('');
  const [invoiceSuccessMessage, setInvoiceSuccessMessage] = useState('');
  const [showInvoiceSuccessModal, setShowInvoiceSuccessModal] = useState(false);

  const filteredInvoices = useMemo(
    () =>
      invoices.sort(
        (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      ),
    [invoices]
  );

  const executeGenerateInvoice = async () => {
    setInvoiceFormError(null);
    setIsLoadingComponent(true);

    const payPeriodInfo = payPeriods.find((pp) => pp.id === generateInvoicePayPeriodId);
    const teamMember = team.find((tm) => tm.id === generateInvoiceTeamMemberId);
    const memberHourlyRate = teamMember?.hourly_rate || 12.5;

    const relevantSchedules = workSchedules.filter(
      (ws) =>
        ws.team_member_id === generateInvoiceTeamMemberId &&
        payPeriodInfo &&
        new Date(ws.date) >= new Date(payPeriodInfo.start_date) &&
        new Date(ws.date) <= new Date(payPeriodInfo.end_date) &&
        (ws.actual_hours || ws.scheduled_hours || 0) > 0
    );

    const newLines: InvoiceLine[] = relevantSchedules.map((ws) => {
      const hours = ws.actual_hours ?? ws.scheduled_hours ?? 0;
      return {
        id: '',
        invoice_id: '',
        date: ws.date,
        description: `Work performed on ${formatDate(ws.date)} - ${
          subDepots.find((sd) => sd.id === ws.sub_depot_id)?.name ||
          'Sub ' + ws.sub_depot_id
        }`,
        hours,
        rate: memberHourlyRate,
        amount: parseFloat((hours * memberHourlyRate).toFixed(2)),
        type: 'Regular',
        work_schedule_id: ws.id,
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
      lines: newLines,
      total_hours: totalHours,
      total_amount: totalAmount,
      status: 'Draft',
      team_member_name: teamMember?.name,
      pay_period_info: payPeriodInfo
        ? `Period ${payPeriodInfo.period_number}/${payPeriodInfo.year}`
        : generateInvoicePayPeriodId,
    };

    const formData = new FormData();
    Object.entries(newInvoiceData).forEach(([key, value]) => {
      formData.append(key, key === 'lines' ? JSON.stringify(value) : String(value));
    });

    const savedInvoice = await apiSaveInvoice(formData, true);
    if (savedInvoice) {
      setInvoiceSuccessMessage(
        `Invoice ${savedInvoice.invoice_number || savedInvoice.id} created.\nTotal: \u00A3${savedInvoice.total_amount}`
      );
      setShowInvoiceSuccessModal(true);
      setGenerateInvoicePayPeriodId('');
      setGenerateInvoiceTeamMemberId('');
    } else {
      setInvoiceFormError('Failed to generate invoice.');
    }
    setIsLoadingComponent(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Invoice Manager</h2>

      <div className="bg-indigo-50 border p-4 rounded mb-6">
        <label className="block mb-2">Select Pay Period</label>
        <select
          value={generateInvoicePayPeriodId}
          onChange={(e) => setGenerateInvoicePayPeriodId(e.target.value)}
          className="w-full mb-3"
        >
          <option value="">-- Select Pay Period --</option>
          {payPeriods.map((pp) => (
            <option key={pp.id} value={pp.id}>
              {pp.period_number}/{pp.year}
            </option>
          ))}
        </select>

        <label className="block mb-2">Select Team Member</label>
        <select
          value={generateInvoiceTeamMemberId}
          onChange={(e) => setGenerateInvoiceTeamMemberId(e.target.value)}
          className="w-full mb-3"
        >
          <option value="">-- Select Team Member --</option>
          {team.map((tm) => (
            <option key={tm.id} value={tm.id}>
              {tm.name}
            </option>
          ))}
        </select>

        <Button
          onClick={executeGenerateInvoice}
          variant="primary"
          leftIcon={Plus}
          disabled={
            !generateInvoicePayPeriodId ||
            !generateInvoiceTeamMemberId ||
            isLoadingComponent
          }
        >
          {isLoadingComponent ? 'Generating...' : 'Generate Draft Invoice'}
        </Button>

        {invoiceFormError && (
          <p className="text-red-500 mt-2">{invoiceFormError}</p>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2">Existing Invoices</h3>
      {isLoadingInvoicesFromHook ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {filteredInvoices.map((inv) => (
            <li key={inv.id} className="p-3 bg-white shadow rounded flex justify-between">
              <span>{inv.invoice_number || inv.id.slice(-6)}</span>
              <span>{formatDate(inv.invoice_date)}</span>
              <span>£{inv.total_amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={showInvoiceSuccessModal}
        onClose={() => setShowInvoiceSuccessModal(false)}
        title="Success!"
        size="md"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 whitespace-pre-line">{invoiceSuccessMessage}</p>
        </div>
        <footer>
          <Button
            onClick={() => setShowInvoiceSuccessModal(false)}
            variant="primary"
            className="w-full"
          >
            Continue
          </Button>
        </footer>
      </Modal>
    </div>
  );
};

export default InvoiceManager;
