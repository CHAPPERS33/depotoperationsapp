// app/api/pay-periods/route.ts
import { NextResponse } from 'next/server';
import type { PayPeriod, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const payPeriods = await query<PayPeriod>('SELECT * FROM pay_periods ORDER BY year DESC, period_number DESC');
    return NextResponse.json<ApiResponse<PayPeriod[]>>({ data: payPeriods, status: 200 });
  } catch (error: any) {
    console.error('GET /api/pay-periods Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch pay periods', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<PayPeriod, 'id' | 'createdAt' | 'updatedAt'> = await request.json();
    
    if (!body.period_number || !body.year || !body.start_date || !body.end_date || !body.status) {
        return NextResponse.json<ApiResponse>({ error: 'Missing required fields for pay period', status: 400});
    }

    const result = await query<PayPeriod>(
      `INSERT INTO pay_periods (period_number, year, start_date, end_date, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [body.period_number, body.year, body.start_date, body.end_date, body.status]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'Failed to create pay period', status: 500});
    }
    return NextResponse.json<ApiResponse<PayPeriod>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/pay-periods Error:', error);
    // Consider checking for unique constraint violations if (year, period_number) should be unique
    // Example: if (error.code === '23505') { ... }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create pay period', message: error.message, status: 500 });
  }
}