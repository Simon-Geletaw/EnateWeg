/**
 * PostgreSQL connection pool using node-postgres (pg).
 * Provides a shared pool and a convenience query helper.
 */
import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB and many managed PostgreSQL providers
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors (don't crash the process)
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

/**
 * Convenience wrapper — executes a parameterized query and returns rows.
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Convenience wrapper — executes a query and returns a single row or null.
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Test the database connection on startup.
 */
export async function testConnection(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
