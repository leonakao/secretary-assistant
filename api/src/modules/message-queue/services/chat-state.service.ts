import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class ChatStateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatStateService.name);
  private redis: Redis | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL environment variable is not set. Typing indicators are disabled.',
      );
      return;
    }

    try {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) =>
        this.logger.warn('Redis connection error', err),
      );
      this.logger.log('Connected to Redis for chat state');
    } catch (error) {
      this.logger.warn('Failed to connect to Redis for chat state', error);
      this.redis = null;
    }
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
      this.logger.log('Disconnected from Redis chat state');
    }
  }

  async setTyping(conversationKey: string): Promise<void> {
    if (!this.redis) {
      return; // No-op if Redis unavailable
    }

    try {
      await this.redis.set(`chat-state:${conversationKey}`, 'typing', 'EX', 45);
    } catch (error) {
      this.logger.warn(
        `Failed to set typing state for ${conversationKey}`,
        error,
      );
    }
  }

  async clearTyping(conversationKey: string): Promise<void> {
    if (!this.redis) {
      return; // No-op if Redis unavailable
    }

    try {
      await this.redis.del(`chat-state:${conversationKey}`);
    } catch (error) {
      this.logger.warn(
        `Failed to clear typing state for ${conversationKey}`,
        error,
      );
    }
  }

  async getState(conversationKey: string): Promise<'typing' | null> {
    if (!this.redis) {
      return null; // Return null if Redis unavailable (graceful degradation)
    }

    try {
      const state = await this.redis.get(`chat-state:${conversationKey}`);
      return state === 'typing' ? 'typing' : null;
    } catch (error) {
      this.logger.warn(
        `Failed to get typing state for ${conversationKey}`,
        error,
      );
      return null;
    }
  }
}
