// app/api/invoices/route.ts
import { NextResponse } from 'next/server';
import type { Invoice, InvoiceLine, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload';

export async function GET(_request: Request) {
  try {
    const { searchParams } = new URL(_request.url);
    const payPeriodId = searchParams.get('pay_period_id');
    const teamMemberId = searchParams.get('team_member_id');
    const status = searchParams.get('status');
    
    let queryString = `
      SELECT 
        i.*, 
        tm.name as team_member_name, 
        pp.period_number || '/' || pp.year as pay_period_info,
        COALESCE(
          (SELECT json_agg(il.* ORDER BY il.date ASC) 
           FROM invoice_lines il 
           WHERE il.invoice_id = i.id),
          '[]'::json
        ) as lines
      FROM invoices i
      JOIN team_members tm ON i.team_member_id = tm.id
      JOIN pay_periods pp ON i.pay_period_id = pp.id
    `;
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (payPeriodId) { conditions.push(`i.pay_period_id = $${paramIndex++}`); queryParams.push(payPeriodId); }
    if (teamMemberId) { conditions.push(`i.team_member_id = $${paramIndex++}`); queryParams.push(teamMemberId); }
    if (status) { conditions.push(`i.status = $${paramIndex++}`); queryParams.push(status); }

    if (conditions.length > 0) {
      queryString += ' WHERE ' + conditions.join(' AND ');
    }
    queryString += ' ORDER BY i.invoice_date DESC, i.created_at DESC';
    
    const invoicesResult = await query<any>(queryString, queryParams); // Use 'any' due to JSON aggregation
    const invoices: Invoice[] = invoicesResult.map(inv => ({
        ...inv,
        lines: inv.lines || [],
        total_hours: Number(inv.total_hours),
        total_amount: Number(inv.total_amount),
        sub_total_amount: inv.sub_total_amount != null ? Number(inv.sub_total_amount) : undefined,
        vat_amount: inv.vat_amount != null ? Number(inv.vat_amount) : null,
    }));
    return NextResponse.json<ApiResponse<Invoice[]>>({ data: invoices, status: 200 });
  } catch (error: any) {
    console.error('GET /api/invoices Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch invoices', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  const dbClient = await getClient();
  try {
    const formData = await _request.formData();
    
    // Extract main invoice fields from FormData
    const pay_period_id = formData.get('pay_period_id') as string;
    const team_member_id = formData.get('team_member_id') as string;
    const invoice_number = formData.get('invoice_number') as string | null;
    const invoice_date = formData.get('invoice_date') as string;
    const due_date = formData.get('due_date') as string | null;
    const total_hours_str = formData.get('total_hours') as string;
    const total_amount_str = formData.get('total_amount') as string;
    const sub_total_amount_str = formData.get('sub_total_amount') as string | null;
    const vat_amount_str = formData.get('vat_amount') as string | null;
    const status = formData.get('status') as Invoice['status'];
    const notes = formData.get('notes') as string | null;
    const team_member_name = formData.get('team_member_name') as string | null; // Optional, might be better to join
    const pay_period_info = formData.get('pay_period_info') as string | null; // Optional, might be better to join

    const linesJson = formData.get('lines') as string; // Assuming lines are sent as a JSON string
    const attachmentFile = formData.get('attachment') as File | null;

    if (!pay_period_id || !team_member_id || !invoice_date || !total_hours_str || !total_amount_str || !status || !linesJson) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for invoice.', status: 400 });
    }
    const lines: Omit<InvoiceLine, 'id' | 'invoice_id'>[] = JSON.parse(linesJson);
    const total_hours = parseFloat(total_hours_str);
    const total_amount = parseFloat(total_amount_str);
    const sub_total_amount = sub_total_amount_str ? parseFloat(sub_total_amount_str) : undefined;
    const vat_amount = vat_amount_str ? parseFloat(vat_amount_str) : null;


    await dbClient.query('BEGIN');

    let attachment_url: string | null = null;
    if (attachmentFile) {
      // The entityId for subfolder can be generated after invoice record is created,
      // or use a temporary ID then update, or store in a general folder.
      // For now, let's assume a general folder for new invoices, or pass a temporary ID if available.
      const uploadedFile = await handleFileUpload(attachmentFile, 'invoices');
      attachment_url = uploadedFile.publicUrl;
    }

    const invoiceResult = await dbClient.query<Invoice>(
      `INSERT INTO invoices (pay_period_id, team_member_id, invoice_number, invoice_date, due_date, 
                             total_hours, total_amount, sub_total_amount, vat_amount, status, notes, attachment_url,
                             team_member_name, pay_period_info) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [pay_period_id, team_member_id, invoice_number, invoice_date, due_date, 
       total_hours, total_amount, sub_total_amount, vat_amount, status, notes, attachment_url,
       team_member_name, pay_period_info]
    );
    const newInvoice = invoiceResult.rows[0];
    
    let savedLines: InvoiceLine[] = [];
    for (const line of lines) {
      const lineResult = await dbClient.query<InvoiceLine>(
        `INSERT INTO invoice_lines (invoice_id, work_schedule_id, date, description, hours, rate, amount, type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [newInvoice.id, line.work_schedule_id, line.date, line.description, line.hours, line.rate, line.amount, line.type]
      );
      savedLines.push(lineResult.rows[0]);
    }
    await dbClient.query('COMMIT');
    
    const newInvoiceWithLines: Invoice = { ...newInvoice, lines: savedLines };
    return NextResponse.json<ApiResponse<Invoice>>({ data: newInvoiceWithLines, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/invoices Error:', error);
     if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create invoice', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}