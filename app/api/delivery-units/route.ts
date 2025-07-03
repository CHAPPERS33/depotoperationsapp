// app/api/delivery-units/route.ts
import { NextResponse } from 'next/server';
import type { DeliveryUnit, ApiResponse } from '../../../types';
import { query } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const deliveryUnits = await query<DeliveryUnit>('SELECT * FROM delivery_units ORDER BY name ASC');
    return NextResponse.json<ApiResponse<DeliveryUnit[]>>({ data: deliveryUnits, status: 200 });
  } catch (error: any) {
    console.error('GET /api/delivery-units Error:', error);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch delivery units', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Omit<DeliveryUnit, 'createdAt' | 'updatedAt'> = await __request.json();
    
    if (!body.id || !body.name) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Delivery Unit ID and Name are required', status: 400});
    }

    const result = await query<DeliveryUnit>(
      `INSERT INTO delivery_units (id, name, address, contact_email) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [body.id, body.name, body.address, body.contact_email]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create delivery unit', status: 500});
    }
    return NextResponse.json<ApiResponse<DeliveryUnit>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/delivery-units Error:', error);
    if (error.code === '23505') { 
        return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create delivery unit', message: 'A delivery unit with this ID already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create delivery unit', message: error.message, status: 500 });
  }
}