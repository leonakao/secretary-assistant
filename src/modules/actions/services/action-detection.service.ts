/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LangchainService } from '../../ai/services/langchain.service';
import { actionDetectionPrompt } from '../prompts/action-detection.prompt';
import { Memory } from '../../chat/entities/memory.entity';
import {
  ActionDetectionResult,
  ActionType,
  Action,
} from '../types/action.types';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ActionDetectionService {
  private readonly logger = new Logger(ActionDetectionService.name);

  constructor(
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private langchainService: LangchainService,
  ) {}

  async detectActionsFromSession(
    sessionId: string,
  ): Promise<ActionDetectionResult> {
    const memories = await this.memoryRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: 4,
    });

    const messages: ConversationMessage[] = memories.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return this.detectActions(messages);
  }

  async detectActions(
    messages: ConversationMessage[],
  ): Promise<ActionDetectionResult> {
    try {
      if (messages.length === 0) {
        return this.noActionResult();
      }

      const conversationContext = this.buildConversationContext(messages);

      const prompt = actionDetectionPrompt();
      const fullPrompt = `${prompt}\n\nCONVERSA:\n${conversationContext}\n\nRESPOSTA JSON:`;

      const response = await this.langchainService.chat(fullPrompt);

      const result = this.parseActionResponse(response);

      this.logger.log(
        `Detected ${result.actions.length} actions. RequiresAction: ${result.requiresAction}. Conversation: ${conversationContext}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error detecting actions:', error);
      return this.noActionResult();
    }
  }

  private buildConversationContext(messages: ConversationMessage[]): string {
    return messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Proprietário' : 'Julia';
        return `${role}: ${msg.content}`;
      })
      .join('\n');
  }

  private parseActionResponse(response: string): ActionDetectionResult {
    try {
      console.log(`Detected action response: ${response}`);
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      cleanedResponse = cleanedResponse.replace(/```$/g, '').trim();

      const parsed = JSON.parse(cleanedResponse);

      if (
        typeof parsed.requiresAction !== 'boolean' ||
        !Array.isArray(parsed.actions)
      ) {
        this.logger.warn('Invalid action response structure');
        return this.noActionResult();
      }

      const validActions = parsed.actions.filter((action: any) => {
        return (
          action.type &&
          Object.values(ActionType).includes(action.type) &&
          typeof action.confidence === 'number' &&
          action.confidence >= 0 &&
          action.confidence <= 1
        );
      });

      const highConfidenceActions = validActions.filter(
        (action: Action) => action.confidence >= 0.5,
      );

      return {
        requiresAction: highConfidenceActions.length > 0,
        actions: highConfidenceActions,
      };
    } catch (error) {
      this.logger.error('Error parsing action response:', error);
      this.logger.debug('Raw response:', response);
      return this.noActionResult();
    }
  }

  private noActionResult(): ActionDetectionResult {
    return {
      requiresAction: false,
      actions: [],
    };
  }

  filterByConfidence(
    result: ActionDetectionResult,
    minConfidence: number = 0.7,
  ): ActionDetectionResult {
    const filteredActions = result.actions.filter(
      (action) => action.confidence >= minConfidence,
    );

    return {
      requiresAction: filteredActions.length > 0,
      actions: filteredActions,
    };
  }
}
