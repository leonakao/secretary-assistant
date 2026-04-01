import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MessageQueue,
  MessageQueueChannel,
  MessageQueueStatus,
  QueuedWebChatMessage,
  QueuedWhatsappMessage,
} from '../entities/message-queue.entity';

type EnqueueMessageParams =
  | {
      companyId: string;
      conversationKey: string;
      channel: MessageQueueChannel.WHATSAPP;
      message: QueuedWhatsappMessage;
    }
  | {
      companyId: string;
      conversationKey: string;
      channel: MessageQueueChannel.WEB_CHAT;
      message: QueuedWebChatMessage;
    };

@Injectable()
export class MessageQueueService {
  constructor(
    @InjectRepository(MessageQueue)
    private readonly messageQueueRepository: Repository<MessageQueue>,
  ) {}

  async enqueueMessage(params: EnqueueMessageParams): Promise<MessageQueue> {
    // Use atomic ON CONFLICT upsert to safely append messages for any pending
    // conversation, regardless of channel.
    const result = await this.messageQueueRepository.query(
      `
      INSERT INTO message_queue (id, company_id, conversation_key, channel, messages, status, enqueued_at, last_message_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, NOW(), NOW())
      ON CONFLICT (conversation_key) WHERE status = 'pending'
      DO UPDATE SET
        messages = message_queue.messages || EXCLUDED.messages,
        last_message_at = NOW()
      RETURNING *
      `,
      [
        params.companyId,
        params.conversationKey,
        params.channel,
        JSON.stringify([params.message]),
        MessageQueueStatus.PENDING,
      ],
    );

    return result[0];
  }

  async findReadyItems(debounceMs: number): Promise<MessageQueue[]> {
    return this.messageQueueRepository
      .createQueryBuilder('mq')
      .where('mq.status = :status', { status: MessageQueueStatus.PENDING })
      .andWhere(`mq.lastMessageAt <= NOW() - interval '${debounceMs} ms'`)
      .getMany();
  }

  async markProcessing(id: string): Promise<void> {
    await this.messageQueueRepository.update(id, {
      status: MessageQueueStatus.PROCESSING,
    });
  }

  async markDone(id: string): Promise<void> {
    await this.messageQueueRepository.update(id, {
      status: MessageQueueStatus.DONE,
      processedAt: new Date(),
    });
  }

  async markFailed(id: string): Promise<void> {
    await this.messageQueueRepository.update(id, {
      status: MessageQueueStatus.FAILED,
      processedAt: new Date(),
    });
  }
}
