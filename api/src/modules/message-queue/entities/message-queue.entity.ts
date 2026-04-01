import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum MessageQueueChannel {
  WHATSAPP = 'whatsapp',
  WEB_CHAT = 'web_chat',
}

export enum MessageQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

export interface QueuedWhatsappMessage {
  instanceName: string;
  payload: unknown; // EvolutionMessagesUpsertPayload
}

export interface QueuedWebChatMessage {
  userId: string;
  text: string;
}

@Entity('message_queue')
@Index(['conversationKey', 'status'])
export class MessageQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 512 })
  @Index()
  conversationKey: string;

  @Column({ type: 'enum', enum: MessageQueueChannel })
  channel: MessageQueueChannel;

  @Column({ type: 'jsonb' })
  messages: QueuedWhatsappMessage[] | QueuedWebChatMessage[];

  @Column({ type: 'enum', enum: MessageQueueStatus, default: 'pending' })
  status: MessageQueueStatus;

  @CreateDateColumn()
  enqueuedAt: Date;

  @Column({ type: 'timestamp with time zone' })
  lastMessageAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt: Date | null;
}
