
// app/api/cage-audits/route.ts
import { NextResponse } from 'next/server';
import type { CageAuditEntry, MissortedParcelDetail, CageAuditImage, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';
import { handleFileUpload } from '../../../lib/fileUpload'; // Adjusted path
import path from 'path';


export async function GET(_request: Request) {
  try {
    // Fetch cage audits and join with related tables
    const cageAuditsResult = await query<any>(`
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
      ORDER BY ca.created_at DESC
    `);

    // Transform the result to match the CageAuditEntry structure for missortImageUrls
    const finalResult: CageAuditEntry[] = cageAuditsResult.map(audit => ({
      ...audit,
      missorted_parcels: audit.missorted_parcels || [],
      images: audit.images || [],
      missortImageUrls: (audit.images as CageAuditImage[] || []).map(img => img.image_url)
    }));

    return NextResponse.json<ApiResponse<CageAuditEntry[]>>({ data: finalResult, status: 200 });
  } catch (error: any) {
    console.error('GET /api/cage-audits Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch cage audits', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  const dbClient = await getClient(); // Use dbClient for transactions
  try {
    const formData = await __request.formData();
    
    const date = formData.get('date') as string;
    const teamMemberId = formData.get('teamMemberId') as string;
    const subDepotIdStr = formData.get('subDepotId') as string;
    const roundId = formData.get('roundId') as string;
    const dropStr = formData.get('drop') as string;
    const totalParcelsInCageStr = formData.get('totalParcelsInCage') as string; // From schema 'total_parcels_in_cage'
    const notes = formData.get('notes') as string | null;
    const missortedParcelsJson = formData.get('missortedParcels') as string | null;
    
    // Validation
    if (!date || !teamMemberId || !subDepotIdStr || !roundId || !dropStr || !totalParcelsInCageStr) {
      return NextResponse.json<ApiResponse>({ error: 'Missing required fields for cage audit.', status: 400 });
    }
    const subDepotId = parseInt(subDepotIdStr, 10);
    const drop = parseInt(dropStr, 10);
    const totalParcelsInCage = parseInt(totalParcelsInCageStr, 10);
    if (isNaN(subDepotId) || isNaN(drop) || isNaN(totalParcelsInCage)) {
         return NextResponse.json<ApiResponse>({ error: 'Invalid numeric value for subDepotId, drop, or totalParcelsInCage.', status: 400 });
    }

    const missortedParcelsData: Array<Omit<MissortedParcelDetail, 'id' | 'cage_audit_id'| 'client_id'> & {client: string}> = missortedParcelsJson ? JSON.parse(missortedParcelsJson) : [];
    const totalMissortsFound = missortedParcelsData.length;

    await dbClient.query('BEGIN');

    const auditResult = await dbClient.query<CageAuditEntry>(
      `INSERT INTO cage_audits (date, team_member_id, sub_depot_id, round_id, drop_number, total_parcels_in_cage, total_missorts_found, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [date, teamMemberId, subDepotId, roundId, drop, totalParcelsInCage, totalMissortsFound, notes]
    );
    const newAudit = auditResult.rows[0];

    const savedMissortedParcels: MissortedParcelDetail[] = [];
    for (const mp of missortedParcelsData) {
      const clientRes = await dbClient.query<{ id: number }>('SELECT id FROM clients WHERE name = $1 LIMIT 1', [mp.client]);
      if (clientRes.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({ error: `Client '${mp.client}' not found. Please add client first.`, status: 400 });
      }
      const clientId = clientRes.rows[0].id;
      const mpResult = await dbClient.query<MissortedParcelDetail>(
        `INSERT INTO cage_audit_missorted_parcels (cage_audit_id, barcode, client_id, reason)
         VALUES ($1, $2, $3, $4) RETURNING id, barcode, client_id, reason`,
        [newAudit.id, mp.barcode, clientId, mp.reason]
      );
      savedMissortedParcels.push({...mpResult.rows[0], client_name: mp.client });
    }
    newAudit.missorted_parcels = savedMissortedParcels;

    const uploadedImageUrls: string[] = [];
    const uploadedImagesData: CageAuditImage[] = [];
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith('missortImages')) { // Assuming files are named like missortImages[0], missortImages[1] etc. or just missortImages
        files.push(value);
      }
    });

    for (const file of files) {
        const uploadedFile = await handleFileUpload(file, 'cage_audits', newAudit.id);
        const imageResult = await dbClient.query<CageAuditImage>(
          `INSERT INTO cage_audit_images (cage_audit_id, image_url, description, uploaded_at) 
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [newAudit.id, uploadedFile.publicUrl, file.name] // Store public URL
        );
        uploadedImagesData.push(imageResult.rows[0]);
        uploadedImageUrls.push(uploadedFile.publicUrl);
    }
    newAudit.images = uploadedImagesData;
    newAudit.missortImageUrls = uploadedImageUrls;

    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<CageAuditEntry>>({ data: newAudit, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/cage-audits Error:', error);
    if (error.message.includes("Invalid file type") || error.message.includes("File too large")) {
      return NextResponse.json<ApiResponse>({ error: 'File upload error', message: error.message, status: 400 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create cage audit', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
