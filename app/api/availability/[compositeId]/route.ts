
// app/api/availability/[compositeId]/route.ts
import { NextResponse } from 'next/server';
import type { ApiResponse } from '../../../../types'; // Adjust path as necessary
import { query } from '../../../../lib/db'; // Adjust path as necessary

interface RouteParams {
  params: { compositeId: string }; // e.g., "TM001__2024-08-15"
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { compositeId } = params;
  try {
    const [teamMemberId, date] = compositeId.split('__');

    if (!teamMemberId || !date) {
      return NextResponse.json<ApiResponse>({ error: 'Invalid composite ID format. Expected teamMemberId__YYYY-MM-DD', status: 400 });
    }
    
    // Validate date format if needed, e.g., using a regex
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json<ApiResponse>({ error: 'Invalid date format in composite ID. Expected YYYY-MM-DD', status: 400 });
    }

    const result = await query(
      'DELETE FROM availability_records WHERE team_member_id = $1 AND date = $2 RETURNING id',
      [teamMemberId, date]
    );

    if (result.length === 0) {
      // It's possible the record didn't exist, which isn't necessarily an error for a DELETE.
      // Depending on desired idempotency, a 404 might be too strong if the goal is "ensure it's not there".
      // For now, returning success even if not found, as the state is achieved.
      // Consider returning 404 if specific "found and deleted" confirmation is crucial.
      // console.warn(`DELETE /api/availability/${compositeId} - Record not found to delete.`);
      return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Availability record for ${teamMemberId} on ${date} not found or already deleted.` }, status: 200 });
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Availability record for ${teamMemberId} on ${date} deleted successfully.` }, status: 200 });

  } catch (error: any) {
    console.error(`DELETE /api/availability/${compositeId} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete availability record', message: error.message, status: 500 });
  }
}
