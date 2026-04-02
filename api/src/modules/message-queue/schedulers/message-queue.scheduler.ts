import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
  MessageQueue,
  MessageQueueChannel,
} from '../entities/message-queue.entity';
import { MessageQueueService } from '../services/message-queue.service';
import { RedisLockService } from '../services/redis-lock.service';
import { WhatsappQueueProcessorService } from '../processors/whatsapp-queue-processor.service';
import { WebChatQueueProcessorService } from '../processors/web-chat-queue-processor.service';

@Injectable()
export class MessageQueueScheduler {
  private readonly logger = new Logger(MessageQueueScheduler.name);
  private readonly debounceMs: number;

  constructor(
    private messageQueueService: MessageQueueService,
    private redisLockService: RedisLockService,
    private whatsappProcessor: WhatsappQueueProcessorService,
    private webChatProcessor: WebChatQueueProcessorService,
    private configService: ConfigService,
  ) {
    this.debounceMs = this.configService.get('WHATSAPP_DEBOUNCE_MS', 10000);
  }

  @Interval(5000)
  async processQueue(): Promise<void> {
    const items = await this.messageQueueService.findReadyItems(
      this.debounceMs,
    );

    for (const item of items) {
      const lockKey = `queue-lock:${item.id}`;
      const acquired = await this.redisLockService.acquireLock(lockKey, 60_000);

      if (!acquired) {
        continue; // Another instance has the lock
      }

      try {
        await this.messageQueueService.markProcessing(item.id);
        await this.route(item);
        await this.messageQueueService.markDone(item.id);
      } catch (error) {
        this.logger.error(`Failed processing queue item ${item.id}`, error);
        await this.messageQueueService.markFailed(item.id);
      } finally {
        await this.redisLockService.releaseLock(lockKey);
      }
    }
  }

  private async route(item: MessageQueue): Promise<void> {
    if (item.channel === MessageQueueChannel.WHATSAPP) {
      await this.whatsappProcessor.process(item);
    } else {
      await this.webChatProcessor.process(item);
    }
  }
}
