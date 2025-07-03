
// app/api/team/route.ts
import { NextResponse } from 'next/server';
import type { TeamMember, ApiResponse } from '../../../types';
import { query } from '../../../lib/db'; 

export async function GET(_request: Request) {
  try {
    const teamMembers = await query<TeamMember>('SELECT * FROM team_members ORDER BY name ASC');
    return NextResponse.json<ApiResponse<TeamMember[]>>({ data: teamMembers, status: 200 });
  } catch (error: any) {
    console.error('GET /api/team Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch team members', message: error.message, status: 500 });
  }
}

export async function POST(_request: Request) {
  try {
    const body: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string } = await __request.json();
    
    if (!body.name || !body.position) {
        return NextResponse.json<ApiResponse>({ error: 'Name and position are required', status: 400});
    }

    const idToUse = body.id || `TM-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;

    const result = await query<TeamMember>(
      `INSERT INTO team_members (id, name, position, email, phone_number, delivery_unit_id, sub_depot_id, is_driver_for_team_member_id, hourly_rate, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        idToUse, 
        body.name, 
        body.position, 
        body.email, 
        body.phone_number,
        body.delivery_unit_id, 
        body.sub_depot_id, 
        body.is_driver_for_team_member_id,
        body.hourly_rate,
        body.is_active !== undefined ? body.is_active : true
      ]
    );
    
    if (result.length === 0) {
        return NextResponse.json<ApiResponse>({ error: 'Failed to create team member, no record returned', status: 500});
    }
    return NextResponse.json<ApiResponse<TeamMember>>({ data: result[0], status: 201 });

  } catch (error: any) {
    console.error('POST /api/team Error:', error);
    if (error.code === '23505') { 
        return NextResponse.json<ApiResponse>({ error: 'Failed to create team member', message: 'A team member with this ID or email already exists.', status: 409});
    }
    return NextResponse.json<ApiResponse>({ error: 'Failed to create team member', message: error.message, status: 500 });
  }
}
