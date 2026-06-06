/**
 * Express application setup.
 * Configures middleware, mounts API routes, and attaches the error handler.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './docs/swagger';

// Route imports (stubs for Phase 1 — filled in Phase 2+)
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import ingredientRoutes from './routes/ingredient.routes';
import mealPlanRoutes from './routes/mealPlan.routes';
import logRoutes from './routes/log.routes';
import healthReadingRoutes from './routes/healthReading.routes';

const app = express();

// ─── Global Middleware ─────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ──────────────────────────────────────────

app.get('/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'YeEnat Weg API',
    version: '1.0.0-mvp',
    timestamp: new Date().toISOString(),
  });
});

app.get('/v1/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── API Routes (v1) ──────────────────────────────────────

app.use('/v1/auth', authRoutes);
app.use('/v1/users/me', profileRoutes);
app.use('/v1/ingredients', ingredientRoutes);
app.use('/v1/meal-plans', mealPlanRoutes);
app.use('/v1/logs', logRoutes);
app.use('/v1/health-readings', healthReadingRoutes);

// ─── 404 Handler ───────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message_am: 'ይህ ዳራ አልተገኘም።',
      message_en: 'This endpoint was not found.',
      detail: null,
    },
  });
});

// ─── Error Handler (must be last) ──────────────────────────

app.use(errorHandler);

export default app;
