import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageQueue } from './entities/message-queue.entity';
import { RedisLockService } from './services/redis-lock.service';
import { ChatStateService } from './services/chat-state.service';
import { MessageQueueService } from './services/message-queue.service';
import { MessageTextExtractorService } from './services/message-text-extractor.service';
import { WhatsappQueueProcessorService } from './processors/whatsapp-queue-processor.service';
import { WebChatQueueProcessorService } from './processors/web-chat-queue-processor.service';
import { MessageQueueScheduler } from './schedulers/message-queue.scheduler';
import { ChatModule } from '../chat/chat.module';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageQueue]),
    forwardRef(() => ChatModule),
    forwardRef(() => AiModule),
    EvolutionModule,
  ],
  providers: [
    MessageQueueService,
    RedisLockService,
    ChatStateService,
    MessageTextExtractorService,
    WhatsappQueueProcessorService,
    WebChatQueueProcessorService,
    MessageQueueScheduler,
  ],
  exports: [MessageQueueService, ChatStateService, MessageTextExtractorService],
})
export class MessageQueueModule {}
