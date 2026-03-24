import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { UserCompany } from '../companies/entities/user-company.entity';
import { Memory } from '../chat/entities/memory.entity';
import { User } from '../users/entities/user.entity';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { OnboardingConversationService } from './services/onboarding-conversation.service';
import { OnboardingCompanyController } from './controllers/onboarding-company.controller';
import { OnboardingStateController } from './controllers/onboarding-state.controller';
import { OnboardingMessagesController } from './controllers/onboarding-messages.controller';
import { CreateOnboardingCompanyUseCase } from './use-cases/create-onboarding-company.use-case';
import { GetOnboardingStateUseCase } from './use-cases/get-onboarding-state.use-case';
import { SendOnboardingMessageUseCase } from './use-cases/send-onboarding-message.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, UserCompany, Memory]),
    forwardRef(() => AiModule),
    AuthModule,
  ],
  controllers: [
    OnboardingCompanyController,
    OnboardingStateController,
    OnboardingMessagesController,
  ],
  providers: [
    OnboardingConversationService,
    CreateOnboardingCompanyUseCase,
    GetOnboardingStateUseCase,
    SendOnboardingMessageUseCase,
  ],
  exports: [OnboardingConversationService],
})
export class OnboardingModule {}
