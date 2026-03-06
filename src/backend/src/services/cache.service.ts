import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

class CacheService {
  private isAvailable(): boolean {
    const redis = getRedis();
    return !!redis && redis.isOpen;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const data = await getRedis()!.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await getRedis()!.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.error(`Cache set error for key ${key}:`, err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await getRedis()!.del(key);
    } catch {}
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const keys = await getRedis()!.keys(pattern);
      if (keys.length > 0) await getRedis()!.del(keys);
    } catch {}
  }
}

export const cacheService = new CacheService();
