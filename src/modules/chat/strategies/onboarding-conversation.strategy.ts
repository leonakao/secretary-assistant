import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { User } from '../../users/entities/user.entity';
import { assistantOnboardingPrompt } from '../../ai/agent-prompts/assistant-onboarding';
import { ActionDetectionService } from '../../actions/services/action-detection.service';
import { ActionExecutorService } from '../../actions/services/action-executor.service';

@Injectable()
export class OnboardingConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OnboardingConversationStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatService: ChatService,
    private actionDetectionService: ActionDetectionService,
    private actionExecutorService: ActionExecutorService,
  ) {}

  async handleConversation(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId?: string;
  }): Promise<ConversationResponse> {
    if (!params.userId) {
      throw new Error('userId is required for onboarding conversation');
    }
    this.logger.log(
      `Handling onboarding conversation for user ${params.userId}`,
    );

    // Get user to build prompt
    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const systemPrompt = assistantOnboardingPrompt(user);

    // Process and reply to user during onboarding
    const { message } = await this.chatService.processAndReply({
      sessionId: params.userId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt,
    });

    // Detect and execute onboarding actions (e.g., FINISH_ONBOARDING)
    await this.detectAndExecuteOnboardingActions({
      sessionId: params.userId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      userId: params.userId,
    });

    return {
      message,
    };
  }

  private async detectAndExecuteOnboardingActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    userId: string;
  }): Promise<string[]> {
    try {
      const detectionResult =
        await this.actionDetectionService.detectActionsFromSession(
          params.sessionId,
          'onboarding',
        );

      this.logger.debug('Onboarding action detection result:', detectionResult);

      if (
        detectionResult.requiresAction &&
        detectionResult.actions.length > 0
      ) {
        const results = await this.actionExecutorService.executeActions(
          detectionResult.actions,
          {
            companyId: params.companyId,
            instanceName: params.instanceName,
            userId: params.userId,
          },
        );

        results.forEach((result) => {
          if (result.success) {
            this.logger.log(
              `✓ Onboarding action executed: ${result.action.type}`,
            );
          } else {
            this.logger.log(
              `✗ Onboarding action failed: ${result.action.type} - ${result.error || result.message}`,
            );
          }
        });

        return results.map((result) => result.action.type);
      }
    } catch (error) {
      this.logger.error('Error in detectAndExecuteOnboardingActions:', error);
    }

    return [];
  }
}
