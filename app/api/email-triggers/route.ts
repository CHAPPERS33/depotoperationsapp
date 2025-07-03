// app/api/email-triggers/route.ts
import { NextResponse } from 'next/server';
import type { EmailTrigger, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const triggers = await query<EmailTrigger>('SELECT * FROM email_triggers ORDER BY name ASC');
    return NextResponse.json<ApiResponse<EmailTrigger[]>>({ data: triggers, status: 200 });
  } catch (error: any) {
    console.error('GET /api/email-triggers Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch email triggers', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<EmailTrigger, 'id' | 'createdAt' | 'updatedAt' | 'last_sent_at' | 'last_run_status' | 'last_error_message'> = await _request.json();
    
    if (!body.name || !body.report_type || !body.frequency || !body.send_time || !body.recipients || body.recipients.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Name, Report Type, Frequency, Send Time, and Recipients are required', status: 400});
    }

    const result = await query<EmailTrigger>(
      `INSERT INTO email_triggers (name, report_type, frequency, day_of_week, day_of_month, send_time, recipients, sub_depot_id_filter, is_enabled, created_by_team_member_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        body.name, body.report_type, body.frequency, body.day_of_week, body.day_of_month, 
        body.send_time, body.recipients, body.sub_depot_id_filter, body.is_enabled !== undefined ? body.is_enabled : false, body.created_by_team_member_id
      ]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create email trigger', status: 500});
    }
    return NextResponse.json<ApiResponse<EmailTrigger>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/email-triggers Error:', error);
     if (error.code === '23503') { // Foreign key violation for sub_depot_id_filter or created_by_team_member_id
         return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create trigger', message: 'Invalid Sub Depot or Team Member ID.', status: 400});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create email trigger', message: error.message, status: 500 });
  }
}