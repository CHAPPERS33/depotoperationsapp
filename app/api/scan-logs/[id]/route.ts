// app/api/scan-logs/[id]/route.ts
import { NextResponse } from 'next/server';
import type { ScanLog, ApiResponse } from '../../../../types';
import { query, getClient } from '../../../../lib/db';
import { handleFileUpload, deleteUploadedFileByRelativePath } from '../../../../lib/fileUpload';
import path from 'path';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const result = await query<ScanLog>('SELECT * FROM scan_logs WHERE id = $1', [id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Scan log not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<ScanLog>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/scan-logs/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch scan log', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const formData = await request.formData();
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let queryIndex = 1;

    // Helper to add fields to update query
    const addFieldToUpdate = (fieldName: string, value: any, isNumeric: boolean = false, isTime: boolean = false) => {
      if (value !== null && value !== undefined) {
        updateFields.push(`${fieldName} = $${queryIndex++}`);
        if (isNumeric) {
          const numVal = parseFloat(value);
          if (isNaN(numVal)) throw new Error(`Invalid numeric value for ${fieldName}`);
          updateValues.push(numVal);
        } else if (isTime && value === '') { // Allow clearing time fields
            updateValues.push(null);
        }
        else {
          updateValues.push(value);
        }
      }
    };

    addFieldToUpdate('date', formData.get('date') as string | null);
    addFieldToUpdate('user_id_team_member', formData.get('user_id_team_member') as string | null);
    addFieldToUpdate('sub_depot_id', formData.get('sub_depot_id') as string | null, true);
    addFieldToUpdate('hht_login_id', formData.get('hht_login_id') as string | null);
    addFieldToUpdate('hht_serial', formData.get('hht_serial') as string | null);
    addFieldToUpdate('total_scanned', formData.get('total_scanned') as string | null, true);
    addFieldToUpdate('missorts', formData.get('missorts') as string | null, true);
    addFieldToUpdate('scan_start_time', formData.get('scan_start_time') as string | null, true);
    addFieldToUpdate('scan_end_time', formData.get('scan_end_time') as string | null, true);
    addFieldToUpdate('notes', formData.get('notes') as string | null);
    
    await dbClient.query('BEGIN');

    const currentLogResult = await dbClient.query<ScanLog>('SELECT photo_url FROM scan_logs WHERE id = $1', [id]);
    if (currentLogResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Scan log not found', status: 404 });
    }
    const current_photo_url = currentLogResult.rows[0].photo_url;
    let photo_url_to_update: string | null | undefined = undefined; // undefined means no change to photo_url

    const newScanImageFile = formData.get('scanImage') as File | null;
    const remove_photo = formData.get('remove_photo_url') === 'true';

    if (remove_photo && current_photo_url) {
      const relativeFilePath = current_photo_url.startsWith('/uploads/') ? current_photo_url.substring('/uploads/'.length) : current_photo_url;
      await deleteUploadedFileByRelativePath(relativeFilePath);
      photo_url_to_update = null; // Set to null to clear the field in DB
    } else if (newScanImageFile) {
      // If there's an existing photo, delete it first
      if (current_photo_url) {
        const relativeFilePath = current_photo_url.startsWith('/uploads/') ? current_photo_url.substring('/uploads/'.length) : current_photo_url;
        await deleteUploadedFileByRelativePath(relativeFilePath);
      }
      // Upload the new file
      const uploadedFile = await handleFileUpload(newScanImageFile, 'scan_logs', id); // Use scan log ID for subfolder
      photo_url_to_update = uploadedFile.publicUrl;
    }
    
    if (photo_url_to_update !== undefined) { // If photo_url is explicitly being changed (to new URL or to null)
        updateFields.push(`photo_url = $${queryIndex++}`);
        updateValues.push(photo_url_to_update);
    }

    if (updateFields.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400});
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    const queryString = `UPDATE scan_logs SET ${updateFields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
    
    const result = await dbClient.query<ScanLog>(queryString, updateValues);
    await dbClient.query('COMMIT');
    
    return NextResponse.json<ApiResponse<ScanLog>>({ data: result.rows[0], status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/scan-logs/${id} Error:`, error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to update scan log', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    // Fetch the scan log to get photo_url for deletion from filesystem
    const scanLogDataResult = await dbClient.query<ScanLog>('SELECT photo_url FROM scan_logs WHERE id = $1', [id]);
    if (scanLogDataResult.rows.length > 0 && scanLogDataResult.rows[0].photo_url) {
        const photoUrl = scanLogDataResult.rows[0].photo_url;
        // Ensure path is relative to the base UPLOAD_DIR for deletion
        const relativeFilePath = photoUrl.startsWith('/uploads/') ? photoUrl.substring('/uploads/'.length) : photoUrl;
        await deleteUploadedFileByRelativePath(relativeFilePath);
    }

    const result = await dbClient.query('DELETE FROM scan_logs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Scan log not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Scan log ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/scan-logs/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete scan log', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
