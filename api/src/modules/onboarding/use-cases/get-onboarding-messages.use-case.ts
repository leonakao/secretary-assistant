import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { OnboardingConversationService } from '../services/onboarding-conversation.service';
import type { User } from 'src/modules/users/entities/user.entity';
import { findPreferredUserCompanyForOnboardingState } from '../utils/find-active-user-company';
import { buildOnboardingThreadId } from '../utils/build-onboarding-thread-id';
import { ChatStateService } from 'src/modules/message-queue/services/chat-state.service';
import {
  mapOnboardingState,
  type OnboardingStateResult,
} from '../utils/map-onboarding-state';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface GetOnboardingMessagesResult {
  threadId: string | null;
  isInitialized: boolean;
  messages: ConversationMessage[];
  onboarding: OnboardingStateResult['onboarding'];
  isTyping: boolean;
}

@Injectable()
export class GetOnboardingMessagesUseCase {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    private readonly onboardingConversationService: OnboardingConversationService,
    private readonly chatStateService: ChatStateService,
  ) {}

  async execute(user: User): Promise<GetOnboardingMessagesResult | null> {
    const userCompany = await findPreferredUserCompanyForOnboardingState(
      this.userCompanyRepository,
      user.id,
    );

    if (!userCompany) {
      // Return null result with empty values
      const defaultState = mapOnboardingState(null);
      return {
        threadId: null,
        isInitialized: false,
        messages: [],
        onboarding: defaultState.onboarding,
        isTyping: false,
      };
    }

    const messages =
      await this.onboardingConversationService.getConversationMessages(
        user.id,
        userCompany.companyId,
      );

    // Get onboarding state
    const onboardingState = mapOnboardingState(userCompany);

    // Get typing indicator state
    const conversationKey = `onboarding:${user.id}:${userCompany.companyId}`;
    const typingState = await this.chatStateService.getState(conversationKey);
    const isTyping = typingState === 'typing';

    return {
      threadId: buildOnboardingThreadId(user.id, userCompany.companyId),
      isInitialized: messages.length > 0,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
      onboarding: onboardingState.onboarding,
      isTyping,
    };
  }
}
