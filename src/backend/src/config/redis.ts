import { createClient } from 'redis';
import { logger } from '../utils/logger';

export type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

export async function connectRedis(): Promise<RedisClient> {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({ url });

  let errorLogged = false;
  client.on('error', (err) => {
    if (!errorLogged) {
      logger.warn('Redis unavailable — running without cache. This is fine for development.');
      errorLogged = true;
    }
  });
  client.on('connect', () => logger.info('Redis connected'));

  await client.connect();
  redisClient = client;
  return redisClient;
}

export function getRedis(): RedisClient | null {
  return redisClient;
}
