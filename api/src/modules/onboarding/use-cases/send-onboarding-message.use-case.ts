import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type {
  OnboardingCompanyResult,
  OnboardingStateResult,
} from '../utils/map-onboarding-state';
import type { User } from 'src/modules/users/entities/user.entity';

export interface SendOnboardingMessageResult {
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
  assistantMessage: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
}

@Injectable()
export class SendOnboardingMessageUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
  ) {}

  async execute(
    user: User,
    message: string,
  ): Promise<SendOnboardingMessageResult> {
    const userCompany = await this.userCompanyRepository.findOne({
      where: { userId: user.id },
      relations: ['company'],
      order: { createdAt: 'ASC' },
    });

    if (!userCompany) {
      throw new NotFoundException('No onboarding company found for this user');
    }

    const { assistantMessage, onboardingState } =
      await this.onboardingConversationService.run({
        userId: user.id,
        companyId: userCompany.companyId,
        message,
      });

    return {
      company: onboardingState.company,
      onboarding: onboardingState.onboarding,
      assistantMessage: {
        role: 'assistant',
        content: assistantMessage,
        createdAt: new Date().toISOString(),
      },
    };
  }
}
