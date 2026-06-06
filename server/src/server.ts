/**
 * Server entry point.
 * Starts the Express server and tests the database connection.
 */
import app from './app';
import { env } from './config/env';
import { testConnection } from './config/database';

async function startServer(): Promise<void> {
  try {
    // Test DB connection
    await testConnection();

    // Start HTTP server
    app.listen(env.PORT, () => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║          🌿 YeEnat Weg API Server 🌿        ║
  ║──────────────────────────────────────────────║
  ║  Port:        ${String(env.PORT).padEnd(30)}║
  ║  Environment: ${env.NODE_ENV.padEnd(30)}║
  ║  Database:    ${env.DB_NAME.padEnd(30)}║
  ╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
