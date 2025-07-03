// app/api/pay-periods/[id]/route.ts
import { NextResponse } from 'next/server';
import type { PayPeriod, ApiResponse } from '../../../../types';
 import  { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<PayPeriod>('SELECT * FROM pay_periods WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Pay period not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<PayPeriod>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/pay-periods/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch pay period', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<PayPeriod, 'id' | 'createdAt' | 'updatedAt'>> = await _request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      const allowedColumns = ['period_number', 'year', 'start_date', 'end_date', 'status'];
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE pay_periods SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<PayPeriod>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Pay period not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<PayPeriod>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/pay-periods/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update pay period', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    // Check if pay period is referenced by forecasts or invoices before deleting
    const forecastRefs = await query('SELECT 1 FROM forecasts WHERE pay_period_id = $1 LIMIT 1', [id]);
    if (forecastRefs.length > 0) {
      return NextResponse.json<ApiResponse>({ error: 'Cannot delete pay period', message: 'This pay period is linked to existing forecasts.', status: 409 });
    }
    const invoiceRefs = await query('SELECT 1 FROM invoices WHERE pay_period_id = $1 LIMIT 1', [id]);
    if (invoiceRefs.length > 0) {
      return NextResponse.json<ApiResponse>({ error: 'Cannot delete pay period', message: 'This pay period is linked to existing invoices.', status: 409 });
    }

    const result = await query('DELETE FROM pay_periods WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Pay period not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Pay period ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/pay-periods/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete pay period', message: error.message, status: 500 });
  }
}