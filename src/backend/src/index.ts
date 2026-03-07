import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { authRoutes } from './routes/auth.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { workerRoutes } from './routes/worker.routes';
import { chatRoutes } from './routes/chat.routes';
import { graphRoutes } from './routes/graph.routes';
import { scrapeRoutes } from './routes/scrape.routes';
import { seekerRoutes } from './routes/seeker.routes';
import { hiringRoutes } from './routes/hiring.routes';
import { authMiddleware } from './middleware/auth';
import { setupSocketHandlers } from './socket';
import { setScrapeIO, startScrapeWorker } from './jobs/scrapeQueue';
import { startScheduler } from './jobs/scheduler';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes — Public
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/scrape', scrapeRoutes);
app.use('/api/v1/hiring', hiringRoutes);

// Routes — Protected
app.use('/api/v1/seeker', authMiddleware, seekerRoutes);
app.use('/api/v1/chat', authMiddleware, chatRoutes);
app.use('/api/v1/graph', authMiddleware, graphRoutes);

// Routes — Legacy (keep for backward compat during transition)
app.use('/api/v1/worker', workerRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.IO
setupSocketHandlers(io);
app.set('io', io);
setScrapeIO(io);

// Bootstrap
async function bootstrap() {
  // Connect MongoDB
  try {
    await connectDB();
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    logger.warn('Running without MongoDB — some features will be unavailable');
  }

  // Connect Redis (optional)
  try {
    await connectRedis();
  } catch (err) {
    logger.warn('Redis connection failed — running without cache');
  }

  // Start scrape worker & scheduler
  try {
    startScrapeWorker();
    startScheduler();
  } catch (err) {
    logger.warn('Scrape worker/scheduler failed to start — scraping unavailable');
  }

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    logger.info(`Skills Mirage API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

bootstrap();

export { app, io };
