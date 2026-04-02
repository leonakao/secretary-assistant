import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentContext } from 'src/modules/ai/agents/agent.state';
import { OnboardingAssistantAgent } from 'src/modules/ai/agents/onboarding-assistant.agent';
import { ExtractAiMessageService } from 'src/modules/ai/services/extract-ai-message.service';
import { LlmModelService } from 'src/modules/ai/services/llm-model.service';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { UserCompany } from 'src/modules/companies/entities/user-company.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  mapOnboardingState,
  OnboardingStateResult,
} from '../utils/map-onboarding-state';
import { buildOnboardingThreadId } from '../utils/build-onboarding-thread-id';
import { ChatStateService } from 'src/modules/message-queue/services/chat-state.service';
import {
  buildLangWatchAttributes,
  langWatchTracer,
} from 'src/observability/langwatch';

export interface RunOnboardingConversationInput {
  userId: string;
  companyId: string;
  message: string;
}

export interface InitializeOnboardingConversationInput {
  userId: string;
  companyId: string;
}

export interface PersistedConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface RunOnboardingConversationResult {
  userMessage: PersistedConversationMessage;
  assistantMessage: PersistedConversationMessage | null;
  onboardingState: OnboardingStateResult;
}

export interface InitializeOnboardingConversationResult {
  initialized: boolean;
  assistantMessage: PersistedConversationMessage | null;
  onboardingState: OnboardingStateResult;
}

type UserCompanyWithCompany = UserCompany & { company: Company };
const CONTINUE_AFTER_TOOL_PROMPT =
  'Continue o onboarding com uma resposta visível para o usuário. Faça a próxima pergunta ou orientação necessária sem deixar a resposta vazia.';

@Injectable()
export class OnboardingConversationService {
  private readonly logger = new Logger(OnboardingConversationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    private readonly onboardingAssistantAgent: OnboardingAssistantAgent,
    private readonly extractAiMessageService: ExtractAiMessageService,
    private readonly chatStateService: ChatStateService,
    private readonly llmModelService: LlmModelService,
  ) {}

  async run(
    input: RunOnboardingConversationInput,
  ): Promise<RunOnboardingConversationResult> {
    const { userId, companyId, message } = input;

    this.logger.log(
      `Running onboarding conversation for user ${userId}, company ${companyId}`,
    );

    const userMessage = await this.saveUserMessage(userId, companyId, message);
    const assistantMessage = await this.generateAssistantReply({
      prompt: message,
      threadId: this.buildThreadId(userId, companyId),
      user: (await this.userRepository.findOneBy({ id: userId }))!,
      company: (await this.userCompanyRepository.findOne({
        where: { userId, companyId },
        relations: ['company'],
      }))!.company,
    });

    const onboardingState = await this.loadOnboardingState(userId, companyId);

    return {
      userMessage,
      assistantMessage,
      onboardingState,
    };
  }

  /**
   * Save a user message to conversation memory
   * Validates access and persists the message
   */
  async saveUserMessage(
    userId: string,
    companyId: string,
    message: string,
  ): Promise<PersistedConversationMessage> {
    await this.loadConversationAccess(userId, companyId);
    const threadId = this.buildThreadId(userId, companyId);

    const userMemory = await this.memoryRepository.save({
      sessionId: threadId,
      companyId,
      role: 'user',
      content: message,
    });

    return this.toConversationMessage(userMemory);
  }

  /**
   * Generate and save assistant reply asynchronously
   * Sets typing indicator while processing, clears it when done
   * All errors are caught and logged — never throws
   * Designed to be called without await
   */
  async generateAndSaveAssistantReplyAsync(
    userId: string,
    companyId: string,
  ): Promise<void> {
    const conversationKey = `onboarding:${userId}:${companyId}`;
    await this.chatStateService.setTyping(conversationKey);

    try {
      const { user, userCompany } = await this.loadConversationAccess(
        userId,
        companyId,
      );
      const threadId = this.buildThreadId(userId, companyId);

      // Get the last user message to use as prompt
      const lastUserMessage = await this.memoryRepository.findOne({
        where: {
          sessionId: threadId,
          role: 'user',
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!lastUserMessage) {
        this.logger.warn(
          `No user message found for onboarding conversation ${userId}/${companyId}`,
        );
        return;
      }

      await this.generateAssistantReply({
        prompt: lastUserMessage.content,
        threadId,
        user,
        company: userCompany.company,
      });
    } catch (error) {
      this.logger.error(
        `Error generating assistant reply for onboarding ${userId}/${companyId}`,
        error,
      );
    } finally {
      await this.chatStateService.clearTyping(conversationKey);
    }
  }

  async initializeThread(
    input: InitializeOnboardingConversationInput,
  ): Promise<InitializeOnboardingConversationResult> {
    const { userId, companyId } = input;
    const { user } = await this.loadConversationAccess(userId, companyId);
    const threadId = this.buildThreadId(userId, companyId);

    const result = await this.executeInitializationTransaction(
      async (repos) => {
        const userCompany = await this.findUserCompanyForInitialization({
          companyId,
          supportsLocks: repos.supportsLocks,
          userCompanyRepository: repos.userCompanyRepository,
          userId,
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

        const existingMessage = await repos.memoryRepository.findOne({
          where: { sessionId: threadId },
          order: { createdAt: 'ASC' },
        });

        if (existingMessage) {
          return { initialized: false, assistantMessage: null };
        }

        const assistantMessage = await this.generateAssistantReply({
          prompt: this.buildInitializationPrompt(userCompany.company),
          threadId,
          user,
          company: userCompany.company,
          memoryRepository: repos.memoryRepository,
        });

        if (!assistantMessage) {
          throw new InternalServerErrorException(
            'Onboarding assistant did not return an opening message',
          );
        }

        return {
          initialized: true,
          assistantMessage,
        };
      },
    );

    const onboardingState = await this.loadOnboardingState(userId, companyId);

    return {
      ...result,
      onboardingState,
    };
  }

  async getConversationMessages(
    userId: string,
    companyId: string,
  ): Promise<Memory[]> {
    return this.memoryRepository.find({
      where: { sessionId: this.buildThreadId(userId, companyId) },
      order: { createdAt: 'ASC' },
    });
  }

  private async loadConversationAccess(userId: string, companyId: string) {
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

    return {
      user,
      userCompany,
    };
  }

  private async generateAssistantReply(params: {
    prompt: string;
    threadId: string;
    user: User;
    company: Company;
    memoryRepository?: Pick<Repository<Memory>, 'save'>;
  }): Promise<PersistedConversationMessage | null> {
    const { prompt, threadId, user, company } = params;
    const memoryRepository = params.memoryRepository ?? this.memoryRepository;
    const agentContext = this.buildAgentContext(user, company);
    const content =
      (await this.collectAssistantReply({
        prompt,
        threadId,
        user,
        agentContext,
      })) ||
      (await this.collectAssistantReply({
        prompt: CONTINUE_AFTER_TOOL_PROMPT,
        threadId,
        user,
        agentContext,
      }));

    if (!content) {
      return null;
    }

    const assistantMemory = await memoryRepository.save({
      sessionId: threadId,
      companyId: company.id,
      role: 'assistant',
      content,
    });

    return this.toConversationMessage(assistantMemory);
  }

  private async collectAssistantReply(params: {
    prompt: string;
    threadId: string;
    user: User;
    agentContext: AgentContext;
  }): Promise<string> {
    const modelName = this.llmModelService.getObservabilityMetadata(
      this.llmModelService.getLlmModel('user-interaction'),
    ).ls_model_name;

    return langWatchTracer.withActiveSpan(
      'onboarding.assistant.reply',
      async (span) => {
        span
          .setType('llm')
          .setRequestModel(modelName)
          .setInput('chat_messages', [
            {
              role: 'user',
              content: params.prompt,
            },
          ])
          .setAttributes(
            buildLangWatchAttributes({
              companyId: params.agentContext.companyId,
              instanceName: params.agentContext.instanceName,
              operation: 'onboarding_assistant_reply',
              threadId: params.threadId,
              userId: params.user.id,
            }),
          );

        const stream = await this.onboardingAssistantAgent.streamConversation(
          params.prompt,
          params.user,
          params.agentContext,
          params.threadId,
        );

        const messageParts: string[] = [];

        for await (const chunk of stream) {
          if (!chunk.assistant) {
            continue;
          }

          const part = this.extractAiMessageService.extractFromChunkMessages(
            chunk.assistant.messages,
          );

          if (!part.trim()) {
            continue;
          }

          messageParts.push(part.trim());
        }

        const content = messageParts.join('\n').trim();

        span
          .setResponseModel(modelName)
          .setOutput('chat_messages', [
            {
              role: 'assistant',
              content,
            },
          ]);

        return content;
      },
    );
  }

  private buildAgentContext(user: User, company: Company): AgentContext {
    return {
      companyId: company.id,
      instanceName: '',
      userId: user.id,
      userName: user.name,
      userPhone: user.phone ?? undefined,
      companyName: company.name,
      businessType: company.businessType ?? undefined,
      companyDescription: this.buildCompanyDescription(company),
      confirmations: [],
    };
  }

  private buildCompanyDescription(company: Company): string {
    const parts = [`Nome da empresa: ${company.name}`];

    if (company.businessType?.trim()) {
      parts.push(`Tipo de negócio: ${company.businessType.trim()}`);
    }

    if (company.description?.trim()) {
      parts.push(`Descrição conhecida: ${company.description.trim()}`);
    }

    parts.push(
      'Use essas informações como contexto inicial do onboarding e evite pedir novamente pelo nome da empresa quando ele já estiver disponível.',
    );

    return parts.join('\n');
  }

  private buildInitializationPrompt(company: Company): string {
    const businessTypeLine = company.businessType?.trim()
      ? `Tipo de negócio já informado: ${company.businessType.trim()}.`
      : 'Tipo de negócio ainda não informado.';

    return `Inicie proativamente a conversa de onboarding na web para a empresa ${company.name}.
Cumprimente o proprietário, mencione a empresa pelo nome de forma natural e continue o fluxo de apresentação sem pedir novamente o nome da empresa.
${businessTypeLine}`;
  }

  private async loadOnboardingState(
    userId: string,
    companyId: string,
  ): Promise<OnboardingStateResult> {
    const refreshedUserCompany = await this.userCompanyRepository.findOne({
      where: { userId, companyId },
      relations: ['company'],
    });

    return mapOnboardingState(
      refreshedUserCompany as UserCompanyWithCompany | null,
    );
  }

  private toConversationMessage(memory: Memory): PersistedConversationMessage {
    return {
      id: memory.id,
      role: memory.role as 'user' | 'assistant',
      content: memory.content,
      createdAt: memory.createdAt.toISOString(),
    };
  }

  private buildThreadId(userId: string, companyId: string): string {
    return buildOnboardingThreadId(userId, companyId);
  }

  private async findUserCompanyForInitialization(params: {
    companyId: string;
    supportsLocks: boolean;
    userCompanyRepository: Repository<UserCompany>;
    userId: string;
  }): Promise<UserCompanyWithCompany | null> {
    const { companyId, supportsLocks, userCompanyRepository, userId } = params;

    if (supportsLocks) {
      const queryBuilder = userCompanyRepository
        .createQueryBuilder('userCompany')
        .innerJoinAndSelect('userCompany.company', 'company')
        .where('userCompany.userId = :userId', { userId })
        .andWhere('userCompany.companyId = :companyId', { companyId })
        .setLock('pessimistic_write');

      return queryBuilder.getOne() as Promise<UserCompanyWithCompany | null>;
    }

    return userCompanyRepository.findOne({
      where: { userId, companyId },
      relations: ['company'],
    }) as Promise<UserCompanyWithCompany | null>;
  }

  private async executeInitializationTransaction<T>(
    callback: (repos: {
      userCompanyRepository: Repository<UserCompany>;
      memoryRepository: Repository<Memory>;
      supportsLocks: boolean;
    }) => Promise<T>,
  ): Promise<T> {
    const manager = this.userCompanyRepository.manager;

    if (!manager?.transaction) {
      return callback({
        userCompanyRepository: this.userCompanyRepository,
        memoryRepository: this.memoryRepository,
        supportsLocks: false,
      });
    }

    return manager.transaction(async (transactionManager) =>
      callback({
        userCompanyRepository: transactionManager.getRepository(UserCompany),
        memoryRepository: transactionManager.getRepository(Memory),
        supportsLocks: true,
      }),
    );
  }
}
