import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type { User } from 'src/modules/users/entities/user.entity';
import { findPreferredUserCompanyForOnboardingState } from '../utils/find-active-user-company';
import { buildOnboardingThreadId } from '../utils/build-onboarding-thread-id';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface GetOnboardingMessagesResult {
  threadId: string;
  messages: ConversationMessage[];
  isInitialized: boolean;
}

@Injectable()
export class GetOnboardingMessagesUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
  ) {}

  async execute(user: User): Promise<GetOnboardingMessagesResult | null> {
    const userCompany = await findPreferredUserCompanyForOnboardingState(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      return null;
    }

    const messages =
      await this.onboardingConversationService.getConversationMessages(
        user.id,
        userCompany.companyId,
      );

    return {
      threadId: buildOnboardingThreadId(user.id, userCompany.companyId),
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
      isInitialized: messages.length > 0,
    };
  }
}
