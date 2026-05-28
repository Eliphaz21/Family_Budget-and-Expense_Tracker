import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { connectDatabase, seedDefaultUsers } from './config/database';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import expensesRoutes from './routes/expenses.routes';
import allowancesRoutes from './routes/allowances.routes';
import commentsRoutes from './routes/comments.routes';
import fundingsRoutes from './routes/fundings.routes';
import notificationsRoutes from './routes/notifications.routes';
import statsRoutes from './routes/stats.routes';
import aiRoutes from './routes/ai.routes';

export async function createBackendApp() {
  await connectDatabase();
  await seedDefaultUsers();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean) : true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mongoReady: true,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/expenses', expensesRoutes);
  app.use('/api/allowances', allowancesRoutes);
  app.use('/api/comments', commentsRoutes);
  app.use('/api/fundings', fundingsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/ai', aiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found.' });
  });

  return app;
}
