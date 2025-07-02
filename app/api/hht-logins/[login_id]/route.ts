// app/api/hht-logins/[login_id]/route.ts
import { NextResponse } from 'next/server';
import type { HHTLogin, ApiResponse } from '../../../../types';
import { query } from '../../../../lib/db';

interface RouteParams {
  params: { login_id: string };
}

// Placeholder for PIN hashing (replace with bcrypt in a real app)
async function hashPin(pin: string): Promise<string> {
  // IMPORTANT: This is NOT secure. For demonstration only.
  return `hashed_${pin.split('').reverse().join('')}`; 
}

export async function GET(request: Request, { params }: RouteParams) {
  const { login_id } = params;
  try {
    const result = await query<HHTLogin>('SELECT login_id, sub_depot_id, notes, is_active, created_at, updated_at FROM hht_logins WHERE login_id = $1', [login_id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'HHT Login not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<HHTLogin>>({ data: result[0], status: 200 });
  } catch (error: any) {
    console.error(`GET /api/hht-logins/${login_id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch HHT Login', message: error.message, status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { login_id } = params;
  try {
    const body: Partial<Omit<HHTLogin, 'login_id' | 'pin_hash' | 'createdAt' | 'updatedAt'>> & { pin?: string } = await request.json();

    if (Object.keys(body).length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No fields provided for update', status: 400 });
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    if (body.pin) {
      const pinHash = await hashPin(body.pin);
      fieldsToUpdate.push(`pin_hash = $${queryIndex++}`);
      values.push(pinHash);
    }
    if (body.sub_depot_id !== undefined) {
      fieldsToUpdate.push(`sub_depot_id = $${queryIndex++}`);
      values.push(body.sub_depot_id);
    }
    if (body.notes !== undefined) {
      fieldsToUpdate.push(`notes = $${queryIndex++}`);
      values.push(body.notes);
    }
    if (body.is_active !== undefined) {
      fieldsToUpdate.push(`is_active = $${queryIndex++}`);
      values.push(body.is_active);
    }
    
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'No valid fields provided for update', status: 400 });
    }

    values.push(login_id); 
    const queryString = `UPDATE hht_logins SET ${fieldsToUpdate.join(', ')}, updated_at = NOW() WHERE login_id = $${queryIndex} RETURNING login_id, sub_depot_id, notes, is_active, created_at, updated_at`;
    
    const result = await query<HHTLogin>(queryString, values);
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'HHT Login not found or no changes made', status: 404 });
    }
    return NextResponse.json<ApiResponse<HHTLogin>>({ data: result[0], status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/hht-logins/${login_id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update HHT Login', message: error.message, status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { login_id } = params;
  try {
    const result = await query('DELETE FROM hht_logins WHERE login_id = $1 RETURNING login_id', [login_id]);
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'HHT Login not found', status: 404 });
    }
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `HHT Login ${login_id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/hht-logins/${login_id} Error:`, error);
    if (error.code === '23503') { 
        return NextResponse.json<ApiResponse>({ error: 'Failed to delete HHT Login', message: 'This login is referenced by other records (e.g., scan logs) and cannot be deleted.', status: 409});
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete HHT Login', message: error.message, status: 500 });
  }
}