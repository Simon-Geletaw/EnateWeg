/**
 * Environment configuration — centralizes all env vars with defaults.
 * Loaded once at startup via dotenv.
 */
import dotenv from 'dotenv';
dotenv.config();

function cleanEnvString(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: cleanEnvString(process.env.NODE_ENV, 'development'),

  // Database
  DB_HOST: cleanEnvString(process.env.DB_HOST, 'localhost'),
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: cleanEnvString(process.env.DB_NAME, 'yeenat_weg'),
  DB_USER: cleanEnvString(process.env.DB_USER, 'postgres'),
  DB_PASSWORD: cleanEnvString(process.env.DB_PASSWORD, 'postgres'),
  DATABASE_URL: cleanEnvString(
    process.env.DATABASE_URL,
    'postgresql://postgres:postgres@localhost:5432/yeenat_weg'
  ),

  // JWT
  JWT_SECRET: cleanEnvString(process.env.JWT_SECRET, 'dev-secret'),
  JWT_REFRESH_SECRET: cleanEnvString(process.env.JWT_REFRESH_SECRET, 'dev-refresh-secret'),
  JWT_EXPIRES_IN: cleanEnvString(process.env.JWT_EXPIRES_IN, '15m'),
  JWT_REFRESH_EXPIRES_IN: cleanEnvString(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),

  // AI (Phase 3)
  GEMINI_API_KEY: cleanEnvString(process.env.GEMINI_API_KEY, ''),
  GEMINI_MODEL: cleanEnvString(process.env.GEMINI_MODEL, 'models/gemini-2.5-flash'),
  ANTHROPIC_API_KEY: cleanEnvString(process.env.ANTHROPIC_API_KEY, ''),
} as const;
