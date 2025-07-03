
// app/api/cage-audits/[id]/route.ts
import { NextResponse } from 'next/server';
import type { CageAuditEntry, MissortedParcelDetail, CageAuditImage, ApiResponse } from '../../../../types';
import { query, getClient } from '../../../../lib/db';
import { handleFileUpload, deleteUploadedFileByRelativePath } from '../../../../lib/fileUpload';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

interface CageAuditRawDBRow extends Omit<CageAuditEntry, 'missorted_parcels' | 'images' | 'missortImageUrls' | 'total_parcels_in_cage' | 'total_missorts_found'> {
  missorted_parcels: MissortedParcelDetail[]; // Assuming pg driver parses JSONB array to JS array
  images: CageAuditImage[]; // Assuming pg driver parses JSONB array to JS array
  total_parcels_in_cage: number | string;
  total_missorts_found: number | string;
}


export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const auditResult = await query<CageAuditRawDBRow>(`
      SELECT 
        ca.id, ca.date, ca.team_member_id, ca.sub_depot_id, ca.round_id, ca.drop_number, 
        ca.total_parcels_in_cage, ca.total_missorts_found, ca.notes, ca.created_at, ca.updated_at,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', mp.id, 
            'cage_audit_id', mp.cage_audit_id, 
            'barcode', mp.barcode, 
            'client_id', mp.client_id, 
            'client_name', c.name, 
            'reason', mp.reason
          ))
           FROM cage_audit_missorted_parcels mp
           JOIN clients c ON mp.client_id = c.id
           WHERE mp.cage_audit_id = ca.id),
          '[]'::json
        ) as missorted_parcels,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', ci.id, 
            'cage_audit_id', ci.cage_audit_id, 
            'image_url', ci.image_url, 
            'description', ci.description,
            'uploaded_at', ci.uploaded_at
          ))
           FROM cage_audit_images ci
           WHERE ci.cage_audit_id = ca.id),
          '[]'::json
        ) as images
      FROM cage_audits ca
      WHERE ca.id = $1
    `, [id]);

    if (auditResult.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Cage audit not found', status: 404 });
    }
    const rawAudit = auditResult[0];
    const finalAudit: CageAuditEntry = {
        id: rawAudit.id,
        date: rawAudit.date,
        team_member_id: rawAudit.team_member_id,
        sub_depot_id: rawAudit.sub_depot_id,
        round_id: rawAudit.round_id,
        drop_number: rawAudit.drop_number,
        total_parcels_in_cage: Number(rawAudit.total_parcels_in_cage),
        total_missorts_found: Number(rawAudit.total_missorts_found),
        notes: rawAudit.notes,
        createdAt: rawAudit.createdAt,
        updatedAt: rawAudit.updatedAt,
        missorted_parcels: rawAudit.missorted_parcels || [],
        images: rawAudit.images || [],
        missortImageUrls: (rawAudit.images || []).map(img => img.image_url)
    };
    return NextResponse.json<ApiResponse<CageAuditEntry>>({ data: finalAudit, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/cage-audits/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch cage audit', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const formData = await request.formData();
    
    const date = formData.get('date') as string;
    const teamMemberId = formData.get('teamMemberId') as string;
    const subDepotIdStr = formData.get('subDepotId') as string;
    const roundId = formData.get('roundId') as string;
    const dropStr = formData.get('drop') as string; 
    const totalParcelsInCageStr = formData.get('totalParcelsInCage') as string;
    const notes = formData.get('notes') as string | null;
    
    const missortedParcelsJson = formData.get('missortedParcels') as string | null; 
    const existingImageIdsJson = formData.get('existingImageIds') as string | null; 
    
    if (!date || !teamMemberId || !subDepotIdStr || !roundId || !dropStr || !totalParcelsInCageStr) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for cage audit update.', status: 400 });
    }
    const subDepotId = parseInt(subDepotIdStr, 10);
    const dropNumber = parseInt(dropStr, 10);
    const totalParcelsInCage = parseInt(totalParcelsInCageStr, 10);
    // Type for input data from form (client name as string initially)
    const missortedParcelsInput: Array<Omit<MissortedParcelDetail, 'id' | 'cage_audit_id'| 'client_id'> & {client_id: number | string, client_name?: string}> = missortedParcelsJson ? JSON.parse(missortedParcelsJson) : [];
    const totalMissortsFound = missortedParcelsInput.length;
    const existingImageIds: number[] = existingImageIdsJson ? JSON.parse(existingImageIdsJson) : [];


    await dbClient.query('BEGIN');

    const auditUpdateResult = await dbClient.query<CageAuditEntry>(
      `UPDATE cage_audits SET 
         date = $1, team_member_id = $2, sub_depot_id = $3, round_id = $4, drop_number = $5, 
         total_parcels_in_cage = $6, total_missorts_found = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [date, teamMemberId, subDepotId, roundId, dropNumber, totalParcelsInCage, totalMissortsFound, notes, id]
    );

    if (auditUpdateResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Cage audit not found', status: 404 });
    }
    const updatedAudit = auditUpdateResult.rows[0];

    await dbClient.query('DELETE FROM cage_audit_missorted_parcels WHERE cage_audit_id = $1', [id]);
    const savedMissortedParcels: MissortedParcelDetail[] = [];
    for (const mp of missortedParcelsInput) { // Use missortedParcelsInput which has client_id directly as number
      const mpResult = await dbClient.query<MissortedParcelDetail>(
        `INSERT INTO cage_audit_missorted_parcels (cage_audit_id, barcode, client_id, reason) VALUES ($1, $2, $3, $4) RETURNING id, barcode, client_id, reason`,
        [id, mp.barcode, mp.client_id, mp.reason] // mp.client_id should be number here
      );
      savedMissortedParcels.push({...mpResult.rows[0], client_name: mp.client_name }); // Include client_name if available from input
    }
    updatedAudit.missorted_parcels = savedMissortedParcels;

    const currentDbImages = await dbClient.query<CageAuditImage>('SELECT * FROM cage_audit_images WHERE cage_audit_id = $1', [id]);
    for (const dbImg of currentDbImages.rows) {
      if (!existingImageIds.includes(dbImg.id)) {
        const relativeFilePath = dbImg.image_url.startsWith('/uploads/') ? dbImg.image_url.substring('/uploads/'.length) : dbImg.image_url;
        await deleteUploadedFileByRelativePath(relativeFilePath);
        await dbClient.query('DELETE FROM cage_audit_images WHERE id = $1', [dbImg.id]);
      }
    }
    const newUploadedImages: CageAuditImage[] = [];
    const files: File[] = [];
    formData.forEach((value, key) => { if (value instanceof File && key.startsWith('newMissortImages')) files.push(value); });

    for (const file of files) {
        const uploadedFile = await handleFileUpload(file, 'cage_audits', id);
        const imageResult = await dbClient.query<CageAuditImage>(
          `INSERT INTO cage_audit_images (cage_audit_id, image_url, description, uploaded_at) VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [id, uploadedFile.publicUrl, file.name]
        );
        newUploadedImages.push(imageResult.rows[0]);
    }
    updatedAudit.images = [...currentDbImages.rows.filter(img => existingImageIds.includes(img.id)), ...newUploadedImages];
    updatedAudit.missortImageUrls = updatedAudit.images.map(img => img.image_url);


    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<CageAuditEntry>>({ data: updatedAudit, status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/cage-audits/${id} Error:`, error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to update cage audit', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    
    const imagesToDelete = await dbClient.query<CageAuditImage>('SELECT image_url FROM cage_audit_images WHERE cage_audit_id = $1', [id]);
    for (const img of imagesToDelete.rows) {
       const relativeFilePath = img.image_url.startsWith('/uploads/') ? img.image_url.substring('/uploads/'.length) : img.image_url;
      await deleteUploadedFileByRelativePath(relativeFilePath);
    }
    await dbClient.query('DELETE FROM cage_audit_images WHERE cage_audit_id = $1', [id]);
    await dbClient.query('DELETE FROM cage_audit_missorted_parcels WHERE cage_audit_id = $1', [id]);
    
    const result = await dbClient.query('DELETE FROM cage_audits WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Cage audit not found', status: 404 });
    }
    
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Cage audit ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/cage-audits/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete cage audit', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
