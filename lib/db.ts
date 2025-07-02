// lib/db.ts
import { Pool, QueryResultRow } from 'pg';

let pool: Pool;

const getDBConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'duc_ops_db', // Ensure this matches your DB name
    user: process.env.DB_USER || 'your_postgres_user', // Replace with your actual DB user
    password: process.env.DB_PASSWORD || 'your_postgres_password', // Replace with your actual DB password
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
};


if (!pool) {
  pool = new Pool(getDBConfig());

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // process.exit(-1); // Avoid process.exit in serverless environments if possible
  });
}

export const query = async <T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T[]> => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const res = await client.query<T>(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, params: params?.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0,50) + '...' : p), duration, rows: res.rowCount });
    return res.rows;
  } catch (error) {
    console.error('Error executing query:', { text, params, error });
    throw error;
  } finally {
    client.release();
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

// Graceful shutdown for server environments
// For Next.js serverless functions, this might not be strictly necessary
// as connections are typically short-lived.
// However, it's good practice for standalone Node.js applications.
// if (typeof process !== 'undefined' && process.on) { // Check if process.on exists
//     process.on('SIGINT', async () => {
//       console.log('Closing database pool (SIGINT)...');
//       if (pool) {
//         await pool.end();
//       }
//       // process.exit(0); // Avoid process.exit in serverless
//     });

//     process.on('SIGTERM', async () => {
//       console.log('Closing database pool (SIGTERM)...');
//       if (pool) {
//         await pool.end();
//       }
//       // process.exit(0); // Avoid process.exit in serverless
//     });
// }
