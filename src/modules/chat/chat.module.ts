import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChatService } from './services/chat.service';
import { EvolutionMessageProvider } from './providers/evolution-message.provider';
import { IncomingMessageUseCase } from './use-cases/incoming-message.use-case';
import { EvolutionWebhookController } from './controllers/evolution-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Memory]), AiModule, EvolutionModule],
  controllers: [EvolutionWebhookController],
  providers: [
    ChatService,
    EvolutionMessageProvider,
    IncomingMessageUseCase,
    {
      provide: 'MESSAGE_PROVIDER',
      useExisting: EvolutionMessageProvider,
    },
  ],
  exports: [TypeOrmModule, ChatService],
})
export class ChatModule {}
