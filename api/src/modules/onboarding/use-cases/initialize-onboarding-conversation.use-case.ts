import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import type { User } from 'src/modules/users/entities/user.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type {
  OnboardingCompanyResult,
  OnboardingStateResult,
} from '../utils/map-onboarding-state';
import { findActiveOnboardingUserCompany } from '../utils/find-active-user-company';

export interface InitializeOnboardingConversationResult {
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
  initialized: boolean;
  assistantMessage: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  } | null;
}

@Injectable()
export class InitializeOnboardingConversationUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
  ) {}

  async execute(user: User): Promise<InitializeOnboardingConversationResult> {
    const userCompany = await findActiveOnboardingUserCompany(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      throw new NotFoundException('No onboarding company found for this user');
    }

    const result = await this.onboardingConversationService.initializeThread({
      userId: user.id,
      companyId: userCompany.companyId,
    });

    return {
      company: result.onboardingState.company,
      onboarding: result.onboardingState.onboarding,
      initialized: result.initialized,
      assistantMessage: result.assistantMessage
        ? {
            ...result.assistantMessage,
            role: 'assistant',
          }
        : null,
    };
  }
}
