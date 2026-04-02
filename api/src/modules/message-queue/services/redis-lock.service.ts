import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisLockService.name);
  private redis: Redis | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL environment variable is not set. Distributed locking is disabled.',
      );
      return;
    }

    try {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) =>
        this.logger.warn('Redis connection error', err),
      );
      this.logger.log('Connected to Redis for distributed locking');
    } catch (error) {
      this.logger.warn(
        'Failed to connect to Redis for distributed locking',
        error,
      );
      this.redis = null;
    }
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
      this.logger.log('Disconnected from Redis');
    }
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    if (!this.redis) {
      this.logger.warn(
        `Redis unavailable. Proceeding without lock for key: ${key}. Double-processing is possible on multi-instance deployments.`,
      );
      return true;
    }

    try {
      const result = await (this.redis as any).set(key, '1', 'px', ttlMs, 'nx');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`Failed to acquire lock for key: ${key}`, error);
      return true; // Proceed without lock on error
    }
  }

  async releaseLock(key: string): Promise<void> {
    if (!this.redis) {
      return; // No-op if Redis unavailable
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Failed to release lock for key: ${key}`, error);
    }
  }
}
