import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionDetectionService } from './services/action-detection.service';
import { ActionExecutorService } from './services/action-executor.service';
import { SendMessageActionService } from './services/send-message-action.service';
import { RequestHumanContactActionService } from './services/request-human-contact-action.service';
import { NotifyUserActionService } from './services/notify-user-action.service';
import { SearchConversationActionService } from './services/search-conversation-action.service';
import { FinishOnboardingActionService } from './services/finish-onboarding-action.service';
import { UpdateCompanyActionService } from './services/update-company-action.service';
import { CreateServiceRequestActionService } from './services/create-service-request-action.service';
import { UpdateServiceRequestActionService } from './services/update-service-request-action.service';
import { QueryServiceRequestActionService } from './services/query-service-request-action.service';
import { RecipientFinderService } from './services/recipient-finder.service';
import { ActionsController } from './controllers/actions.controller';
import { ExecuteActionUseCase } from './use-cases/execute-action.use-case';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { Memory } from '../chat/entities/memory.entity';
import { AiModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { EvolutionMessageProvider } from '../chat/providers/evolution-message.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, Company, User, Memory]),
    forwardRef(() => AiModule),
    forwardRef(() => ChatModule),
    ServiceRequestsModule,
  ],
  controllers: [ActionsController],
  providers: [
    ActionDetectionService,
    ActionExecutorService,
    SendMessageActionService,
    RequestHumanContactActionService,
    NotifyUserActionService,
    SearchConversationActionService,
    FinishOnboardingActionService,
    UpdateCompanyActionService,
    CreateServiceRequestActionService,
    UpdateServiceRequestActionService,
    QueryServiceRequestActionService,
    RecipientFinderService,
    ExecuteActionUseCase,
    {
      provide: 'MESSAGE_PROVIDER',
      useExisting: EvolutionMessageProvider,
    },
  ],
  exports: [ActionDetectionService, ActionExecutorService],
})
export class ActionsModule {}
