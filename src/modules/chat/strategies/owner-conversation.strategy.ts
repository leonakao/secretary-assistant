import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationStrategy } from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';
import { Memory } from '../entities/memory.entity';
import { ActionDetectionService } from '../../actions/services/action-detection.service';
import { ActionExecutorService } from '../../actions/services/action-executor.service';

@Injectable()
export class OwnerConversationStrategy implements ConversationStrategy {
  private readonly logger = new Logger(OwnerConversationStrategy.name);

  constructor(
    private chatService: ChatService,
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private actionDetectionService: ActionDetectionService,
    private actionExecutorService: ActionExecutorService,
  ) {}

  async handleConversation(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    systemPrompt: string;
    userId?: string;
  }): Promise<void> {
    // 1. Process and reply to the owner
    await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt: params.systemPrompt,
    });

    // 2. Detect and execute actions
    if (params.userId) {
      await this.detectAndExecuteActions({
        sessionId: params.sessionId,
        companyId: params.companyId,
        instanceName: params.instanceName,
        userId: params.userId,
      });
    }
  }

  /**
   * Detects and executes actions from recent conversation messages
   */
  private async detectAndExecuteActions(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    userId: string;
  }): Promise<void> {
    try {
      const memories = await this.memoryRepository.find({
        where: { sessionId: params.sessionId },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      const recentMessages = memories.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const detectionResult =
        await this.actionDetectionService.detectActions(recentMessages);

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
      }
    } catch (error) {
      this.logger.error('Error in detectAndExecuteActions:', error);
      // Don't throw - we don't want action detection to break the main flow
    }
  }
}
