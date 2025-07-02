
// app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Invoice, InvoiceLine, ApiResponse } from '../../../../types';
import { query, getClient } from '../../../../lib/db';
import { handleFileUpload, deleteUploadedFileByRelativePath } from '../../../../lib/fileUpload';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

interface InvoiceRawDBRow extends Omit<Invoice, 'lines' | 'total_hours' | 'total_amount' | 'sub_total_amount' | 'vat_amount'> {
  lines: InvoiceLine[]; // Assuming pg driver parses JSONB array to JS array
  total_hours: number | string;
  total_amount: number | string;
  sub_total_amount?: number | string | null;
  vat_amount?: number | string | null;
  team_member_name?: string;
  pay_period_info?: string;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const invoiceResult = await query<InvoiceRawDBRow>(`
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
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Invoice not found', status: 404 });
    }
    const rawInvoice = invoiceResult[0];
    const invoice: Invoice = {
        id: rawInvoice.id,
        pay_period_id: rawInvoice.pay_period_id,
        team_member_id: rawInvoice.team_member_id,
        invoice_number: rawInvoice.invoice_number,
        invoice_date: rawInvoice.invoice_date,
        due_date: rawInvoice.due_date,
        lines: (rawInvoice.lines || []).map((l:any) => ({...l, hours: Number(l.hours), rate: Number(l.rate), amount: Number(l.amount) })),
        total_hours: Number(rawInvoice.total_hours),
        total_amount: Number(rawInvoice.total_amount),
        sub_total_amount: rawInvoice.sub_total_amount != null ? Number(rawInvoice.sub_total_amount) : undefined,
        vat_amount: rawInvoice.vat_amount != null ? Number(rawInvoice.vat_amount) : null,
        status: rawInvoice.status,
        paid_date: rawInvoice.paid_date,
        payment_method: rawInvoice.payment_method,
        notes: rawInvoice.notes,
        attachment_url: rawInvoice.attachment_url,
        createdAt: rawInvoice.createdAt,
        updatedAt: rawInvoice.updatedAt,
        team_member_name: rawInvoice.team_member_name,
        pay_period_info: rawInvoice.pay_period_info,
    };
    return NextResponse.json<ApiResponse<Invoice>>({ data: invoice, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/invoices/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch invoice', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const formData = await request.formData(); 
    
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
    const paid_date = formData.get('paid_date') as string | null;
    const team_member_name = formData.get('team_member_name') as string | null;
    const pay_period_info = formData.get('pay_period_info') as string | null;

    const linesJson = formData.get('lines') as string;
    const newAttachmentFile = formData.get('attachment') as File | null;
    const removeAttachmentFlag = formData.get('remove_attachment') === 'true';

    if (!pay_period_id || !team_member_id || !invoice_date || !total_hours_str || !total_amount_str || !status || !linesJson) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for invoice update.', status: 400 });
    }
    const lines: (Omit<InvoiceLine, 'invoice_id'> & { id?: number })[] = JSON.parse(linesJson).map((line: any) => ({
        ...line,
        hours: parseFloat(String(line.hours)),
        rate: parseFloat(String(line.rate)),
        amount: parseFloat(String(line.amount)),
    }));
    const total_hours = parseFloat(total_hours_str);
    const total_amount = parseFloat(total_amount_str);
    const sub_total_amount = sub_total_amount_str ? parseFloat(sub_total_amount_str) : undefined;
    const vat_amount = vat_amount_str ? parseFloat(vat_amount_str) : null;

    await dbClient.query('BEGIN');

    let attachment_url_to_update: string | null | undefined = undefined; 
    const currentInvoiceResult = await dbClient.query<{ attachment_url: string | null }>('SELECT attachment_url FROM invoices WHERE id = $1', [id]);
    if (currentInvoiceResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Invoice not found', status: 404 });
    }
    let current_attachment_url = currentInvoiceResult.rows[0].attachment_url;

    if (removeAttachmentFlag && current_attachment_url) {
        const relativeFilePath = current_attachment_url.startsWith('/uploads/') ? current_attachment_url.substring('/uploads/'.length) : current_attachment_url;
        await deleteUploadedFileByRelativePath(relativeFilePath);
        attachment_url_to_update = null; 
    } else if (newAttachmentFile) {
        if (current_attachment_url) { 
            const relativeFilePath = current_attachment_url.startsWith('/uploads/') ? current_attachment_url.substring('/uploads/'.length) : current_attachment_url;
            await deleteUploadedFileByRelativePath(relativeFilePath);
        }
        const uploadedFile = await handleFileUpload(newAttachmentFile, 'invoices', id);
        attachment_url_to_update = uploadedFile.publicUrl;
    }
    
    const invoiceUpdateResult = await dbClient.query<Invoice>(
      `UPDATE invoices SET 
         pay_period_id = $1, team_member_id = $2, invoice_number = $3, invoice_date = $4, due_date = $5, 
         total_hours = $6, total_amount = $7, sub_total_amount = $8, vat_amount = $9, status = $10, notes = $11, 
         attachment_url = $12, 
         paid_date = $13, team_member_name = $14, pay_period_info = $15, updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [pay_period_id, team_member_id, invoice_number, invoice_date, due_date, 
       total_hours, total_amount, sub_total_amount, vat_amount, status, notes, 
       attachment_url_to_update === undefined ? current_attachment_url : attachment_url_to_update,
       paid_date, team_member_name, pay_period_info, id]
    );
    
    const updatedInvoice = invoiceUpdateResult.rows[0];

    await dbClient.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [id]);
    let savedLines: InvoiceLine[] = [];
    for (const line of lines) {
      const lineResult = await dbClient.query<InvoiceLine>(
        `INSERT INTO invoice_lines (invoice_id, work_schedule_id, date, description, hours, rate, amount, type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, line.work_schedule_id, line.date, line.description, line.hours, line.rate, line.amount, line.type]
      );
      savedLines.push(lineResult.rows[0]);
    }
    await dbClient.query('COMMIT');
    
    const updatedInvoiceWithLines: Invoice = { ...updatedInvoice, lines: savedLines };
    return NextResponse.json<ApiResponse<Invoice>>({ data: updatedInvoiceWithLines, status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/invoices/${id} Error:`, error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to update invoice', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');

    const invoiceDataResult = await dbClient.query<{ attachment_url: string | null }>('SELECT attachment_url FROM invoices WHERE id = $1', [id]);
    if (invoiceDataResult.rows.length > 0 && invoiceDataResult.rows[0].attachment_url) {
        const relativeFilePath = invoiceDataResult.rows[0].attachment_url.startsWith('/uploads/') 
            ? invoiceDataResult.rows[0].attachment_url.substring('/uploads/'.length) 
            : invoiceDataResult.rows[0].attachment_url;
        await deleteUploadedFileByRelativePath(relativeFilePath);
    }

    await dbClient.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [id]);
    const result = await dbClient.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Invoice not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Invoice ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/invoices/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete invoice', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
