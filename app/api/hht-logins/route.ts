// app/api/hht-logins/route.ts
import { NextResponse } from 'next/server';
import type { HHTLogin, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

// Placeholder for PIN hashing (replace with bcrypt in a real app)
async function hashPin(pin: string): Promise<string> {
  // IMPORTANT: This is NOT secure. For demonstration only.
  // In a real application, use a strong hashing library like bcrypt.
  return `hashed_${pin.split('').reverse().join('')}`; 
}

export async function GET(_request: Request) {
  try {
    const hhtLogins = await query<HHTLogin>('SELECT login_id, sub_depot_id, notes, is_active, created_at, updated_at FROM hht_logins ORDER BY login_id ASC');
    return NextResponse.json<ApiResponse<HHTLogin[]>>({ data: hhtLogins, status: 200 });
  } catch (error: any) {
    console.error('GET /api/hht-logins Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch HHT logins', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<HHTLogin, 'pin_hash' | 'createdAt' | 'updatedAt'> & { pin: string } = await _request.json();
    
    if (!body.login_id || !body.pin || body.sub_depot_id === undefined) {
      return NextResponse.json<ApiResponse>({ error: 'Login ID, PIN, and Sub Depot ID are required', status: 400 });
    }

    const pinHash = await hashPin(body.pin);

    const result = await query<HHTLogin>(
      `INSERT INTO hht_logins (login_id, pin_hash, sub_depot_id, notes, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING login_id, sub_depot_id, notes, is_active, created_at, updated_at`, 
      [body.login_id, pinHash, body.sub_depot_id, body.notes, body.is_active !== undefined ? body.is_active : true]
    );
    
    if (result.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Failed to create HHT login', status: 500 });
    }
    return NextResponse.json<ApiResponse<HHTLogin>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/hht-logins Error:', error);
    if (error.code === '23505') { 
      return NextResponse.json<ApiResponse>({ error: 'Failed to create HHT login', message: 'An HHT login with this ID already exists.', status: 409 });
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create HHT login', message: error.message, status: 500 });
  }
}