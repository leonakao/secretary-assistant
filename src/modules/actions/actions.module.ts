import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionDetectionService } from './services/action-detection.service';
import { ActionExecutorService } from './services/action-executor.service';
import { FinishOnboardingActionService } from './services/finish-onboarding-action.service';
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
    FinishOnboardingActionService,
    ExecuteActionUseCase,
    {
      provide: 'MESSAGE_PROVIDER',
      useExisting: EvolutionMessageProvider,
    },
  ],
  exports: [ActionDetectionService, ActionExecutorService],
})
export class ActionsModule {}
