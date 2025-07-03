// app/api/waves/route.ts
import { NextResponse } from 'next/server';
import type { WaveEntry, VehicleType, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload';

export async function GET(request: Request) {
  try {
    const waves = await query<WaveEntry>('SELECT * FROM waves ORDER BY date DESC, time DESC');
    return NextResponse.json<ApiResponse<WaveEntry[]>>({ data: waves, status: 200 });
  } catch (error: any) {
    console.error('GET /api/waves Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch waves', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await _request.formData();
    const van_reg = formData.get('van_reg') as string;
    const vehicle_type = formData.get('vehicle_type') as VehicleType;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const pallet_count_str = formData.get('pallet_count') as string;
    const notes = formData.get('notes') as string | null;
    const sub_depot_id_str = formData.get('sub_depot_id') as string | null;
    const team_member_id = formData.get('team_member_id') as string | null;
    const waveImageFile = formData.get('waveImage') as File | null;

    if (!van_reg || !vehicle_type || !date || !time || !pallet_count_str) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for wave entry.', status: 400 });
    }
    const pallet_count = parseInt(pallet_count_str, 10);
    if (isNaN(pallet_count)) {
        return NextResponse.json<ApiResponse>({ error: 'Invalid pallet count.', status: 400 });
    }
    const sub_depot_id = sub_depot_id_str ? parseInt(sub_depot_id_str, 10) : null;

    let photo_url: string | null = null;
    if (waveImageFile) {
      const uploadedFile = await handleFileUpload(waveImageFile, 'waves'); // Store in 'waves' subfolder
      photo_url = uploadedFile.publicUrl;
    }

    const result = await query<WaveEntry>(
      `INSERT INTO waves (van_reg, vehicle_type, date, time, pallet_count, photo_url, notes, sub_depot_id, team_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [van_reg, vehicle_type, date, time, pallet_count, photo_url, notes, sub_depot_id, team_member_id]
    );
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Failed to create wave entry', status: 500 });
    }
    return NextResponse.json<ApiResponse<WaveEntry>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/waves Error:', error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create wave entry', message: error.message, status: 500 });
  }
}