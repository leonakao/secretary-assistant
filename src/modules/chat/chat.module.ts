import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './entities/memory.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { UserCompany } from '../companies/entities/user-company.entity';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { ActionsModule } from '../actions/actions.module';
import { ChatService } from './services/chat.service';
import { EvolutionMessageProvider } from './providers/evolution-message.provider';
import { IncomingMessageUseCase } from './use-cases/incoming-message.use-case';
import { EvolutionWebhookController } from './controllers/evolution-webhook.controller';
import { ClientConversationStrategy } from './strategies/client-conversation.strategy';
import { OwnerConversationStrategy } from './strategies/owner-conversation.strategy';
import { OnboardingConversationStrategy } from './strategies/onboarding-conversation.strategy';
import { Company } from '../companies/entities/company.entity';
import { Mediation } from '../service-requests/entities/mediation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Memory,
      Contact,
      User,
      UserCompany,
      Company,
      Mediation,
    ]),
    forwardRef(() => AiModule),
    EvolutionModule,
    forwardRef(() => ActionsModule),
  ],
  controllers: [EvolutionWebhookController],
  providers: [
    ChatService,
    EvolutionMessageProvider,
    IncomingMessageUseCase,
    ClientConversationStrategy,
    OwnerConversationStrategy,
    OnboardingConversationStrategy,
    {
      provide: 'MESSAGE_PROVIDER',
      useExisting: EvolutionMessageProvider,
    },
  ],
  exports: [
    TypeOrmModule,
    ChatService,
    EvolutionMessageProvider,
    'MESSAGE_PROVIDER',
  ],
})
export class ChatModule {}
