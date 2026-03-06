import mongoose from 'mongoose';
import { TUNING } from './tuning';
import { logger } from '../utils/logger';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skills-mirage';

  await mongoose.connect(uri, {
    maxPoolSize: TUNING.MONGO_POOL_SIZE,
    minPoolSize: 2,
    maxIdleTimeMS: TUNING.MONGO_MAX_IDLE_MS,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  logger.info('MongoDB connected');
}
