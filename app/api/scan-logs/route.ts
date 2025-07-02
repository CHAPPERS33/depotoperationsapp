// app/api/scan-logs/route.ts
import { NextResponse } from 'next/server';
import type { ScanLog, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload';

export async function GET(request: Request) {
  try {
    const scanLogs = await query<ScanLog>('SELECT * FROM scan_logs ORDER BY date DESC, scan_start_time DESC');
    return NextResponse.json<ApiResponse<ScanLog[]>>({ data: scanLogs, status: 200 });
  } catch (error: any) {
    console.error('GET /api/scan-logs Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch scan logs', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const date = formData.get('date') as string;
    const user_id_team_member = formData.get('user_id_team_member') as string;
    const sub_depot_id_str = formData.get('sub_depot_id') as string;
    const hht_login_id = formData.get('hht_login_id') as string;
    const hht_serial = formData.get('hht_serial') as string;
    const total_scanned_str = formData.get('total_scanned') as string;
    const missorts_str = formData.get('missorts') as string | null;
    const scan_start_time = formData.get('scan_start_time') as string | null;
    const scan_end_time = formData.get('scan_end_time') as string | null;
    const notes = formData.get('notes') as string | null;
    const scanImageFile = formData.get('scanImage') as File | null;

    if (!date || !user_id_team_member || !sub_depot_id_str || !hht_login_id || !hht_serial || !total_scanned_str) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for scan log.', status: 400 });
    }
    const sub_depot_id = parseInt(sub_depot_id_str, 10);
    const total_scanned = parseInt(total_scanned_str, 10);
    const missorts = missorts_str ? parseInt(missorts_str, 10) : null;

    if (isNaN(sub_depot_id) || isNaN(total_scanned) || (missorts_str && isNaN(missorts!))) {
      return NextResponse.json<ApiResponse>({ error: 'Invalid numeric value for sub_depot_id, total_scanned, or missorts.', status: 400 });
    }

    let photo_url: string | null = null;
    if (scanImageFile) {
      const uploadedFile = await handleFileUpload(scanImageFile, 'scan_logs');
      photo_url = uploadedFile.publicUrl;
    }

    const result = await query<ScanLog>(
      `INSERT INTO scan_logs (date, user_id_team_member, sub_depot_id, hht_login_id, hht_serial, total_scanned, missorts, scan_start_time, scan_end_time, photo_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [date, user_id_team_member, sub_depot_id, hht_login_id, hht_serial, total_scanned, missorts, scan_start_time, scan_end_time, photo_url, notes]
    );
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Failed to create scan log', status: 500 });
    }
    return NextResponse.json<ApiResponse<ScanLog>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/scan-logs Error:', error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create scan log', message: error.message, status: 500 });
  }
}