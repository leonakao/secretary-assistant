import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { OnboardingAssistantAgent } from 'src/modules/ai/agents/onboarding-assistant.agent';
import { ExtractAiMessageService } from 'src/modules/ai/services/extract-ai-message.service';
import { AgentContext } from 'src/modules/ai/agents/agent.state';
import {
  mapOnboardingState,
  OnboardingStateResult,
} from '../utils/map-onboarding-state';

export interface RunOnboardingConversationInput {
  userId: string;
  companyId: string;
  message: string;
}

export interface RunOnboardingConversationResult {
  assistantMessage: string;
  onboardingState: OnboardingStateResult;
}

@Injectable()
export class OnboardingConversationService {
  private readonly logger = new Logger(OnboardingConversationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    private readonly onboardingAssistantAgent: OnboardingAssistantAgent,
    private readonly extractAiMessageService: ExtractAiMessageService,
  ) {}

  async run(
    input: RunOnboardingConversationInput,
  ): Promise<RunOnboardingConversationResult> {
    const { userId, companyId, message } = input;

    this.logger.log(
      `Running onboarding conversation for user ${userId}, company ${companyId}`,
    );

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const userCompany = await this.userCompanyRepository.findOne({
      where: { userId, companyId },
      relations: ['company'],
    });

    if (!userCompany) {
      throw new NotFoundException(
        `No company relation found for user ${userId}`,
      );
    }

    if (userCompany.company.step === 'running') {
      throw new ConflictException(
        'Onboarding is already complete for this company',
      );
    }

    const threadId = `onboarding:${companyId}:${userId}`;

    await this.memoryRepository.save({
      sessionId: threadId,
      companyId,
      role: 'user',
      content: message,
    });

    const agentContext: AgentContext = {
      companyId,
      instanceName: '',
      userId,
      userName: user.name,
      userPhone: user.phone ?? undefined,
      companyDescription: '',
      confirmations: [],
    };

    const stream = await this.onboardingAssistantAgent.streamConversation(
      message,
      user,
      agentContext,
      threadId,
    );

    const messageParts: string[] = [];

    for await (const chunk of stream) {
      if (chunk.assistant) {
        const part = this.extractAiMessageService.extractFromChunkMessages(
          chunk.assistant.messages,
        );
        if (part) {
          messageParts.push(part);
        }
      }
    }

    const assistantMessage = messageParts.join('\n');

    if (assistantMessage.trim()) {
      await this.memoryRepository.save({
        sessionId: threadId,
        companyId,
        role: 'assistant',
        content: assistantMessage,
      });
    }

    const refreshedUserCompany = await this.userCompanyRepository.findOne({
      where: { userId, companyId },
      relations: ['company'],
    });

    const onboardingState = mapOnboardingState(
      refreshedUserCompany as (UserCompany & { company: Company }) | null,
    );

    return { assistantMessage, onboardingState };
  }

  async getConversationMessages(
    userId: string,
    companyId: string,
  ): Promise<Memory[]> {
    const threadId = `onboarding:${companyId}:${userId}`;
    return this.memoryRepository.find({
      where: { sessionId: threadId },
      order: { createdAt: 'ASC' },
    });
  }
}
