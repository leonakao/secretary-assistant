import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationResponse,
  ConversationStrategy,
} from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { ActionDetectionService } from '../../actions/services/action-detection.service';
import { ActionExecutorService } from '../../actions/services/action-executor.service';
import { User } from '../../users/entities/user.entity';
import { assistantOwnerPrompt } from '../../ai/agent-prompts/assistant-owner';

@Injectable()
export class OwnerConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OwnerConversationStrategy.name);

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
  }): Promise<ConversationResponse> {
    const user = await this.userRepository.findOneByOrFail({
      id: params.userId,
    });

    const systemPrompt = assistantOwnerPrompt(user);

    const { message } = await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt,
    });

    const actions = await this.detectAndExecuteActions({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      userId: params.userId,
    });

    return {
      message,
      actions,
    };
  }

  private async detectAndExecuteActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    userId: string;
  }): Promise<string[]> {
    try {
      const detectionResult =
        await this.actionDetectionService.detectActionsFromSession(
          params.sessionId,
        );

      this.logger.debug('Detection result:', detectionResult);

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
            this.logger.log(`✓ Action executed: ${result.action.type}`);
          } else {
            this.logger.log(
              `✗ Action failed: ${result.action.type} - ${result.error || result.message}`,
            );
          }
        });

        return results.map((result) => result.action.type);
      }
    } catch (error) {
      this.logger.error('Error in detectAndExecuteActions:', error);
    }

    return [];
  }
}
