import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationStrategy } from './conversation-strategy.interface';
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
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId: string;
  }): Promise<void> {
    this.logger.log(
      `Handling onboarding conversation for session ${params.sessionId}`,
    );

    // Get user to build prompt
    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const systemPrompt = assistantOnboardingPrompt(user);

    // Process and reply to user during onboarding
    await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt,
    });

    // Detect and execute onboarding actions (e.g., FINISH_ONBOARDING)
    await this.detectAndExecuteOnboardingActions({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      userId: params.userId,
    });
  }

  private async detectAndExecuteOnboardingActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    userId: string;
  }): Promise<void> {
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
            this.logger.log(`✓ Onboarding action executed: ${result.action.type}`);
          } else {
            this.logger.log(
              `✗ Onboarding action failed: ${result.action.type} - ${result.error || result.message}`,
            );
          }
        });
      }
    } catch (error) {
      this.logger.error('Error in detectAndExecuteOnboardingActions:', error);
    }
  }
}
