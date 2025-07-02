
import { Invoice, TeamMember, PayPeriod } from '../types';

export const generateInvoicePDFContent = (invoice: Invoice, teamMember?: TeamMember, payPeriodDetails?: PayPeriod): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number || invoice.id}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.5; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .company-info h1 { margin: 0; color: #333; font-size: 24px; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { margin: 0; color: #666; font-size: 20px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .bill-to, .invoice-details { background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #eee;}
    .bill-to h3, .invoice-details h3 { margin-top: 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom:10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .amount, .number { text-align: right; }
    .totals { text-align: right; margin-top: 20px; }
    .total-row { font-weight: bold; font-size: 16px; background-color: #e9ecef; }
    .total-row td { padding: 12px 10px; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .status.draft { background-color: #ffc107; color: #000; }
    .status.sent { background-color: #17a2b8; color: white; }
    .status.paid { background-color: #28a745; color: white; }
    .status.void { background-color: #dc3545; color: white; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
    @media print { 
      body { margin: 0; padding: 15px; font-size:10pt; } 
      .no-print { display: none; } 
      table { font-size: 9pt; }
      th, td { padding: 6px; }
      .total-row td { padding: 8px 6px; }
      .header h1 { font-size: 20px; }
      .invoice-info h2 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>DUC Operations</h1>
      <p>Edmonton Delivery Unit<br>Invoice Management System</p>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>${invoice.invoice_number || invoice.id}</strong></p>
      <span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="details">
    <div class="bill-to">
      <h3>Bill To:</h3>
      <p>
        <strong>${teamMember?.name || invoice.team_member_id}</strong><br>
        ${teamMember?.position || ''}<br>
        ${teamMember?.email || ''}
      </p>
    </div>
    <div class="invoice-details">
      <h3>Invoice Details:</h3>
      <p>
        <strong>Invoice Date:</strong> ${new Date(invoice.invoice_date + 'T00:00:00Z').toLocaleDateString('en-GB')}<br>
        <strong>Pay Period:</strong> ${invoice.pay_period_info || (payPeriodDetails ? `${payPeriodDetails.period_number}/${payPeriodDetails.year}` : invoice.pay_period_id)}<br>
        ${payPeriodDetails ? `<strong>Period Dates:</strong> ${new Date(payPeriodDetails.start_date + 'T00:00:00Z').toLocaleDateString('en-GB')} - ${new Date(payPeriodDetails.end_date + 'T00:00:00Z').toLocaleDateString('en-GB')}<br>` : ''}
        ${invoice.due_date ? `<strong>Due Date:</strong> ${new Date(invoice.due_date + 'T00:00:00Z').toLocaleDateString('en-GB')}<br>` : ''}
        ${invoice.paid_date ? `<strong>Paid Date:</strong> ${new Date(invoice.paid_date + 'T00:00:00Z').toLocaleDateString('en-GB')}<br>` : ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th class="number">Hours</th>
        <th class="amount">Rate</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines.map(line => `
        <tr>
          <td>${new Date(line.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td>
          <td>${line.description} (${line.type})</td>
          <td class="number">${line.hours.toFixed(2)}</td>
          <td class="amount">£${line.rate.toFixed(2)}</td>
          <td class="amount">£${line.amount.toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL</strong></td>
        <td class="number"><strong>${invoice.total_hours.toFixed(2)}</strong></td>
        <td></td>
        <td class="amount"><strong>£${invoice.total_amount.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${invoice.notes ? `<div style="margin-top: 20px; padding:10px; background:#f8f9fa; border:1px solid #eee; border-radius:5px;"><h3>Notes:</h3><p>${invoice.notes.replace(/\n/g, '<br>')}</p></div>` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString('en-GB')} • DUC Operations Invoice System</p>
  </div>
  
  <script class="no-print">
    window.onload = function() {
      // Adding a slight delay can help ensure content is fully rendered, especially complex CSS.
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;
};

export const printHtmlContent = (htmlContent: string, title: string = 'Print Document'): void => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  
  if (printWindow) {
    // onload event for the new window is more reliable.
    printWindow.onload = () => {
      // The script inside the HTML might already trigger print.
      // If not, or for more control:
      // printWindow.print(); 
      // URL.revokeObjectURL(url); // Clean up after print dialog is closed (tricky to time this perfectly)
    };
  } else {
    alert("Popup blocked! Please allow popups for this site to print. Alternatively, the HTML file will download.");
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
