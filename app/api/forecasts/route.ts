// app/api/forecasts/route.ts
import { NextResponse } from 'next/server';
import type { Forecast, ForecastVolume, ApiResponse } from '../../../types';
import { query, getClient } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const forecastsResult = await query<any>(`
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
      ORDER BY f.forecast_for_date DESC
    `);
    const forecasts: Forecast[] = forecastsResult.map(f => ({
        ...f,
        volumes: f.volumes || [],
        // Ensure numeric fields are numbers
        total_volume: f.total_volume != null ? Number(f.total_volume) : null,
        calculated_hours: f.calculated_hours != null ? Number(f.calculated_hours) : null,
        planned_shift_length: f.planned_shift_length != null ? Number(f.planned_shift_length) : null,
    }));
    return NextResponse.json<ApiResponse<Forecast[]>>({ data: forecasts, status: 200 });
  } catch (error: any) {
    console.error('GET /api/forecasts Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to fetch forecasts', message: error.message, status: 500 });
  }
}

export async function POST(request: Request) {
  const dbClient = await getClient();
  try {
    const body: Omit<Forecast, 'id' | 'createdAt' | 'updatedAt' | 'volumes' | 'pay_period_info'> & { volumes?: Omit<ForecastVolume, 'id' | 'forecast_id'>[] } = await request.json();
    
    if (!body.forecast_for_date) {
        return NextResponse.json<ApiResponse>({ error: 'Forecast date is required', status: 400});
    }

    await dbClient.query('BEGIN');
    const forecastResult = await dbClient.query<Forecast>(
      `INSERT INTO forecasts (forecast_for_date, pay_period_id, total_volume, calculated_hours, planned_shift_length, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [body.forecast_for_date, body.pay_period_id, body.total_volume, body.calculated_hours, body.planned_shift_length, body.notes]
    );
    const newForecast = forecastResult.rows[0];
    
    let savedVolumes: ForecastVolume[] = [];
    if (body.volumes && body.volumes.length > 0) {
      for (const vol of body.volumes) {
        const volResult = await dbClient.query<ForecastVolume>(
          `INSERT INTO forecast_volumes (forecast_id, sub_depot_id, volume, notes) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [newForecast.id, vol.sub_depot_id, vol.volume, vol.notes]
        );
        savedVolumes.push(volResult.rows[0]);
      }
    }
    await dbClient.query('COMMIT');
    
    const newForecastWithVolumes: Forecast = { ...newForecast, volumes: savedVolumes };
    return NextResponse.json<ApiResponse<Forecast>>({ data: newForecastWithVolumes, status: 201 });

  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('POST /api/forecasts Error:', error);
    return NextResponse.json<ApiResponse>({ error: 'Failed to create forecast', message: error.message, status: 500 });
  } finally {
    dbClient.release();
  }
}