
// app/api/forecasts/[id]/route.ts
import { NextResponse } from 'next/server';
import type { Forecast, ForecastVolume, ApiResponse } from '../../../../types';
import { query, getClient } from '../../../../lib/db';

interface RouteParams {
  params: { id: string }; // ID is UUID TEXT
}

interface ForecastRawDBRow extends Omit<Forecast, 'volumes' | 'total_volume' | 'calculated_hours' | 'planned_shift_length'> {
  volumes: ForecastVolume[]; 
  total_volume: number | string | null;
  calculated_hours: number | string | null;
  planned_shift_length: number | string | null;
  pay_period_info?: string;
}


export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;
  try {
    const forecastResult = await query<ForecastRawDBRow>(`
      SELECT 
        f.*,
        pp.period_number || '/' || pp.year as pay_period_info,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', fv.id, 
            'forecast_id', fv.forecast_id, 
            'sub_depot_id', fv.sub_depot_id,
            'sub_depot_name', sd.name, 
            'volume', fv.volume,
            'notes', fv.notes
            ))
           FROM forecast_volumes fv
           JOIN sub_depots sd ON fv.sub_depot_id = sd.id
           WHERE fv.forecast_id = f.id),
          '[]'::json
        ) as volumes
      FROM forecasts f
      LEFT JOIN pay_periods pp ON f.pay_period_id = pp.id
      WHERE f.id = $1
    `, [id]);

    if (forecastResult.length === 0) {
      return NextResponse.json<ApiResponse>({ error: 'Forecast not found', status: 404 });
    }
    const rawForecast = forecastResult[0];
    const forecast: Forecast = {
        id: rawForecast.id,
        forecast_for_date: rawForecast.forecast_for_date,
        pay_period_id: rawForecast.pay_period_id,
        total_volume: rawForecast.total_volume != null ? Number(rawForecast.total_volume) : null,
        calculated_hours: rawForecast.calculated_hours != null ? Number(rawForecast.calculated_hours) : null,
        planned_shift_length: rawForecast.planned_shift_length != null ? Number(rawForecast.planned_shift_length) : null,
        notes: rawForecast.notes,
        createdAt: rawForecast.createdAt,
        updatedAt: rawForecast.updatedAt,
        volumes: (rawForecast.volumes || []).map((v: any) => ({ 
            ...v,
            volume: Number(v.volume) 
        })),
        pay_period_info: rawForecast.pay_period_info,
    };
    return NextResponse.json<ApiResponse<Forecast>>({ data: forecast, status: 200 });
  } catch (error: any) {
    console.error(`GET /api/forecasts/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch forecast', message: error.message, status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    const body: Partial<Omit<Forecast, 'id' | 'createdAt' | 'updatedAt' | 'pay_period_info'>> & { volumes?: Array<Omit<ForecastVolume, 'id' | 'forecast_id' | 'sub_depot_name'>> } = await __request.json();
    
    await dbClient.query('BEGIN');
    const forecastUpdateResult = await dbClient.query<Forecast>(
      `UPDATE forecasts SET 
         forecast_for_date = $1, pay_period_id = $2, total_volume = $3, 
         calculated_hours = $4, planned_shift_length = $5, notes = $6, updated_at = NOW() 
       WHERE id = $7 RETURNING *`,
      [body.forecast_for_date, body.pay_period_id, body.total_volume, body.calculated_hours, body.planned_shift_length, body.notes, id]
    );

    if (forecastUpdateResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Forecast not found', status: 404 });
    }

    await dbClient.query('DELETE FROM forecast_volumes WHERE forecast_id = $1', [id]);
    let savedVolumes: ForecastVolume[] = [];
    if (body.volumes && body.volumes.length > 0) {
      for (const vol of body.volumes) {
        const volResult = await dbClient.query<Omit<ForecastVolume, 'sub_depot_name'>>( // DB doesn't store sub_depot_name here
          `INSERT INTO forecast_volumes (forecast_id, sub_depot_id, volume, notes) 
           VALUES ($1, $2, $3, $4) RETURNING id, forecast_id, sub_depot_id, volume, notes`,
          [id, vol.sub_depot_id, vol.volume, vol.notes]
        );
        // Fetch sub_depot_name to include in the response
        const subDepotNameResult = await dbClient.query<{ name: string }>('SELECT name FROM sub_depots WHERE id = $1', [vol.sub_depot_id]);
        savedVolumes.push({
            ...volResult.rows[0],
            sub_depot_name: subDepotNameResult.rows[0]?.name
        });
      }
    }
    await dbClient.query('COMMIT');
    
    const finalQueryResult = await query<ForecastRawDBRow>(`
        SELECT f.*, pp.period_number || '/' || pp.year as pay_period_info
        FROM forecasts f
        LEFT JOIN pay_periods pp ON f.pay_period_id = pp.id
        WHERE f.id = $1
    `, [id]);

    const rawUpdatedForecast = finalQueryResult[0];
    const updatedForecastWithDetails: Forecast = { 
        id: rawUpdatedForecast.id,
        forecast_for_date: rawUpdatedForecast.forecast_for_date,
        pay_period_id: rawUpdatedForecast.pay_period_id,
        total_volume: rawUpdatedForecast.total_volume != null ? Number(rawUpdatedForecast.total_volume) : null,
        calculated_hours: rawUpdatedForecast.calculated_hours != null ? Number(rawUpdatedForecast.calculated_hours) : null,
        planned_shift_length: rawUpdatedForecast.planned_shift_length != null ? Number(rawUpdatedForecast.planned_shift_length) : null,
        notes: rawUpdatedForecast.notes,
        createdAt: rawUpdatedForecast.createdAt,
        updatedAt: rawUpdatedForecast.updatedAt,
        volumes: savedVolumes.map(v => ({
            ...v,
            volume: Number(v.volume),
        })),
        pay_period_info: rawUpdatedForecast.pay_period_info,
    };
    return NextResponse.json<ApiResponse<Forecast>>({ data: updatedForecastWithDetails, status: 200 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`PUT /api/forecasts/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to update forecast', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = params;
  const dbClient = await getClient();
  try {
    await dbClient.query('BEGIN');
    const linkedSchedules = await dbClient.query('SELECT 1 FROM work_schedules WHERE forecast_id = $1 LIMIT 1', [id]);
    if (linkedSchedules.rows.length > 0) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({ error: 'Cannot delete forecast', message: 'This forecast is linked to existing work schedules. Please remove those links first.', status: 409 });
    }
    
    await dbClient.query('DELETE FROM forecast_volumes WHERE forecast_id = $1', [id]); 
    const result = await dbClient.query('DELETE FROM forecasts WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({ error: 'Forecast not found', status: 404 });
    }
    await dbClient.query('COMMIT');
    return NextResponse.json<ApiResponse<{ message: string }>>({ data: { message: `Forecast ${id} deleted successfully` }, status: 200 });
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error(`DELETE /api/forecasts/${id} Error:`, error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to delete forecast', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}
