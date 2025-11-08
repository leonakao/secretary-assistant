import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { UserCompany } from '../companies/entities/user-company.entity';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChatService } from './services/chat.service';
import { EvolutionMessageProvider } from './providers/evolution-message.provider';
import { IncomingMessageUseCase } from './use-cases/incoming-message.use-case';
import { EvolutionWebhookController } from './controllers/evolution-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory, Contact, User, UserCompany]),
    AiModule,
    EvolutionModule,
  ],
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
