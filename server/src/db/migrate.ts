/**
 * Database migration runner.
 * Reads and executes the SQL migration file against the configured database.
 * Usage: npx tsx src/db/migrate.ts
 */
import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function runMigration(): Promise<void> {
  const migrationPath = path.join(__dirname, 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🔄 Running YeEnat Weg database migration...');

  try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
