// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import type { Client, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const clients = await query<Client>('SELECT * FROM clients ORDER BY name ASC');
    return NextResponse.json<ApiResponse<Client[]>>({ data: clients, status: 200 });
  } catch (error: any) {
    console.error('GET /api/clients Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch clients', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = await _request.json();
    
    if (!body.name) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Client Name is required', status: 400});
    }

    const result = await query<Client>(
      `INSERT INTO clients (name, code, is_high_priority, contact_person, contact_email) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [body.name, body.code, body.is_high_priority || false, body.contact_person, body.contact_email]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create client', status: 500});
    }
    return NextResponse.json<ApiResponse<Client>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/clients Error:', error);
    if (error.code === '23505') { // Unique constraint violation (name or code)
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create client', message: 'A client with this name or code already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create client', message: error.message, status: 500 });
  }
}