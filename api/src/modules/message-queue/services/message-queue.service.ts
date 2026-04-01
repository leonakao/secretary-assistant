import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MessageQueue,
  MessageQueueChannel,
  MessageQueueStatus,
  QueuedWebChatMessage,
  QueuedWhatsappMessage,
} from '../entities/message-queue.entity';

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);

  constructor(
    @InjectRepository(MessageQueue)
    private readonly messageQueueRepository: Repository<MessageQueue>,
  ) {}

  async enqueueWhatsapp(
    companyId: string,
    conversationKey: string,
    message: QueuedWhatsappMessage,
  ): Promise<MessageQueue> {
    // Use atomic ON CONFLICT upsert to safely append messages
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
        companyId,
        conversationKey,
        MessageQueueChannel.WHATSAPP,
        JSON.stringify([message]),
        MessageQueueStatus.PENDING,
      ],
    );

    return result[0];
  }

  async enqueueWebChat(
    companyId: string,
    conversationKey: string,
    message: QueuedWebChatMessage,
  ): Promise<MessageQueue> {
    // Check if pending or processing item exists
    const existing = await this.messageQueueRepository.findOne({
      where: [
        { conversationKey, status: MessageQueueStatus.PENDING },
        { conversationKey, status: MessageQueueStatus.PROCESSING },
      ],
    });

    if (existing) {
      throw new ConflictException(
        `A message is already pending or processing for conversation ${conversationKey}`,
      );
    }

    // Create new item
    const newItem = this.messageQueueRepository.create({
      companyId,
      conversationKey,
      channel: MessageQueueChannel.WEB_CHAT,
      messages: [message],
      lastMessageAt: new Date(),
    });

    return this.messageQueueRepository.save(newItem);
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
