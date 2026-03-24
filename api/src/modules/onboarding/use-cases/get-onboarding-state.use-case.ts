import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import {
  mapOnboardingState,
  type OnboardingCompanyResult,
  type OnboardingStateResult,
} from '../utils/map-onboarding-state';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type { User } from 'src/modules/users/entities/user.entity';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationResult {
  threadId: string;
  messages: ConversationMessage[];
}

export interface GetOnboardingStateResult {
  company: OnboardingCompanyResult | null;
  onboarding: OnboardingStateResult['onboarding'];
  conversation: ConversationResult | null;
}

@Injectable()
export class GetOnboardingStateUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
  ) {}

  async execute(user: User): Promise<GetOnboardingStateResult> {
    const userCompany = await this.userCompanyRepository.findOne({
      where: { userId: user.id },
      relations: ['company'],
      order: { createdAt: 'ASC' },
    });

    const { company, onboarding } = mapOnboardingState(
      userCompany as (UserCompany & { company: Company }) | null,
    );

    if (!userCompany) {
      return { company, onboarding, conversation: null };
    }

    const messages =
      await this.onboardingConversationService.getConversationMessages(
        user.id,
        userCompany.companyId,
      );

    const conversation: ConversationResult = {
      threadId: `onboarding:${userCompany.companyId}:${user.id}`,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };

    return { company, onboarding, conversation };
  }
}
