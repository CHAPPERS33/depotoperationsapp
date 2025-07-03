// app/api/waves/[id]/route.ts
import { NextResponse } from 'next/server';
import type { WaveEntry, VehicleType, ApiResponse } from '../../../../types';
import { query  } from '../../../../lib/db';
 
import _path from 'path';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<WaveEntry>('SELECT * FROM waves WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Wave entry not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<WaveEntry>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/waves/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch wave entry', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const formData = await _request.formData();
    const van_reg = formData.get('van_reg') as string | null;
    const vehicle_type = formData.get('vehicle_type') as VehicleType | null;
    const date = formData.get('date') as string | null;
    const time = formData.get('time') as string | null;
    const pallet_count_str = formData.get('pallet_count') as string | null;
    const notes = formData.get('notes') as string | null;
    const sub_depot_id_str = formData.get('sub_depot_id') as string | null;
    const team_member_id = formData.get('team_member_id') as string | null;
    const newWaveImageFile = formData.get('waveImage') as File | null;
    const remove_photo_url = formData.get('remove_photo_url') === 'true';

    await dbClient.query('BEGIN');

    const currentWaveResult = await dbClient.query<WaveEntry>('SELECT photo_url FROM waves WHERE id = $1', [id]);
    if (currentWaveResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Wave entry not found', status: 404 });
    }
    const current_photo_url = currentWaveResult.rows[0].photo_url;
    let photo_url_to_update: string | null | undefined = undefined; 

    if (remove_photo_url && current_photo_url) {
      const relativeFilePath = current_photo_url.startsWith('/uploads/') ? current_photo_url.substring('/uploads/'.length) : current_photo_url;
      await deleteUploadedFileByRelativePath(relativeFilePath);
      photo_url_to_update = null;
    } else if (newWaveImageFile) {
      if (current_photo_url) {
        const relativeFilePath = current_photo_url.startsWith('/uploads/') ? current_photo_url.substring('/uploads/'.length) : current_photo_url;
        await deleteUploadedFileByRelativePath(relativeFilePath);
      }
      const uploadedFile = await handleFileUpload(newWaveImageFile, 'waves', id);
      photo_url_to_update = uploadedFile.publicUrl;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let queryIndex = 1;

    if (van_reg) { updateFields.push(`van_reg = $${queryIndex++}`); updateValues.push(van_reg); }
    if (vehicle_type) { updateFields.push(`vehicle_type = $${queryIndex++}`); updateValues.push(vehicle_type); }
    if (date) { updateFields.push(`date = $${queryIndex++}`); updateValues.push(date); }
    if (time) { updateFields.push(`time = $${queryIndex++}`); updateValues.push(time); }
    if (pallet_count_str) { 
      const pallet_count = parseInt(pallet_count_str, 10);
      if (isNaN(pallet_count)) { throw new Error('Invalid pallet count for update.'); }
      updateFields.push(`pallet_count = $${queryIndex++}`); updateValues.push(pallet_count); 
    }
    if (notes !== null) { updateFields.push(`notes = $${queryIndex++}`); updateValues.push(notes); } 
    if (sub_depot_id_str !== null) { 
        const sub_depot_id = sub_depot_id_str ? parseInt(sub_depot_id_str, 10) : null;
        if (sub_depot_id_str && isNaN(sub_depot_id!)) { throw new Error('Invalid sub_depot_id for update.'); }
        updateFields.push(`sub_depot_id = $${queryIndex++}`); updateValues.push(sub_depot_id); 
    }
    if (team_member_id !== null) { updateFields.push(`team_member_id = $${queryIndex++}`); updateValues.push(team_member_id); }
    
    if (photo_url_to_update !== undefined) { 
        updateFields.push(`photo_url = $${queryIndex++}`);
        updateValues.push(photo_url_to_update);
    }


    if (updateFields.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400});
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    const queryString = `UPDATE waves SET ${updateFields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await dbClient.query<WaveEntry>(queryString, updateValues);
    await dbClient.query('COMMIT');
    
    return NextResponse.json<ApiResponse<WaveEntry>>({ data: result.rows[0], status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/waves/${id} Error:`, error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to update wave entry', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    const waveDataResult = await dbClient.query<WaveEntry>('SELECT photo_url FROM waves WHERE id = $1', [id]);
    if (waveDataResult.rows.length > 0 && waveDataResult.rows[0].photo_url) {
      const relativeFilePath = waveDataResult.rows[0].photo_url.startsWith('/uploads/') 
        ? waveDataResult.rows[0].photo_url.substring('/uploads/'.length)
        : waveDataResult.rows[0].photo_url;
      await deleteUploadedFileByRelativePath(relativeFilePath);
    }

    const result = await dbClient.query('DELETE FROM waves WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Wave entry not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Wave entry ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/waves/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete wave entry', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}