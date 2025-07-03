// app/api/email-triggers/[id]/route.ts
import { NextResponse } from 'next/server';
import type { EmailTrigger, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<EmailTrigger>('SELECT * FROM email_triggers WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Email Trigger not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<EmailTrigger>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/email-triggers/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch email trigger', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const body: Partial<Omit<EmailTrigger, 'id' | 'createdAt' | 'updatedAt'>> = await __request.json();

    if (Object.keys(body).length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'No fields provided for update', status: 400});
    }
    
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;
    
    const allowedColumns = [
        'name', 'report_type', 'frequency', 'day_of_week', 'day_of_month', 
        'send_time', 'recipients', 'sub_depot_id_filter', 'is_enabled', 
        'last_sent_at', 'last_run_status', 'last_error_message', 'created_by_team_member_id'
    ];

    Object.entries(body).forEach(([key, value]) => {
      if(allowedColumns.includes(key)){
        fieldsToUpdate.push(`${key} = $${queryIndex++}`);
        values.push(value);
      }
    });
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(id);
    const queryString = `UPDATE email_triggers SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await query<EmailTrigger>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Email Trigger not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<EmailTrigger>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/email-triggers/${id} Error:`, error);
    if (error.code === '23503') { // Foreign key violation
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update trigger', message: 'Invalid Sub Depot or Team Member ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update email trigger', message: error.message, status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query('DELETE FROM email_triggers WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Email Trigger not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: {message: `Email Trigger ${id} deleted successfully`}, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/email-triggers/${id} Error:`, error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete email trigger', message: error.message, status: 500 });
  }
}