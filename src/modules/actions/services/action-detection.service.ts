import { Injectable, Logger } from '@nestjs/common';
import { LangchainService } from '../../ai/services/langchain.service';
import { actionDetectionPrompt } from '../prompts/action-detection.prompt';
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

  constructor(private langchainService: LangchainService) {}

  /**
   * Analyzes the last N messages from a conversation to detect required actions
   * @param messages - Array of conversation messages (last N messages)
   * @param maxMessages - Maximum number of messages to analyze (default: 5)
   */
  async detectActions(
    messages: ConversationMessage[],
    maxMessages: number = 5,
  ): Promise<ActionDetectionResult> {
    try {
      // Get last N messages
      const recentMessages = messages.slice(-maxMessages);

      if (recentMessages.length === 0) {
        return this.noActionResult();
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(recentMessages);

      // Call LLM with action detection prompt
      const prompt = actionDetectionPrompt();
      const fullPrompt = `${prompt}\n\nCONVERSA:\n${conversationContext}\n\nRESPOSTA JSON:`;

      const response = await this.langchainService.chat(fullPrompt);

      // Parse JSON response
      const result = this.parseActionResponse(response);

      this.logger.log(
        `Detected ${result.actions.length} actions. RequiresAction: ${result.requiresAction}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error detecting actions:', error);
      return this.noActionResult();
    }
  }

  /**
   * Builds a formatted conversation context string
   */
  private buildConversationContext(
    messages: ConversationMessage[],
  ): string {
    return messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Proprietário' : 'Julia';
        return `${role}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * Parses the LLM response and validates the action structure
   */
  private parseActionResponse(response: string): ActionDetectionResult {
    try {
      // Clean response (remove markdown code blocks if present)
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      cleanedResponse = cleanedResponse.replace(/```$/g, '').trim();

      const parsed = JSON.parse(cleanedResponse);

      // Validate structure
      if (
        typeof parsed.requiresAction !== 'boolean' ||
        !Array.isArray(parsed.actions)
      ) {
        this.logger.warn('Invalid action response structure');
        return this.noActionResult();
      }

      // Validate each action
      const validActions = parsed.actions.filter((action: any) => {
        return (
          action.type &&
          Object.values(ActionType).includes(action.type) &&
          typeof action.confidence === 'number' &&
          action.confidence >= 0 &&
          action.confidence <= 1
        );
      });

      // Filter out low confidence actions (< 0.5)
      const highConfidenceActions = validActions.filter(
        (action: Action) => action.confidence >= 0.5,
      );

      return {
        requiresAction:
          highConfidenceActions.length > 0 &&
          highConfidenceActions.some(
            (action: Action) => action.type !== ActionType.NONE,
          ),
        actions: highConfidenceActions,
      };
    } catch (error) {
      this.logger.error('Error parsing action response:', error);
      this.logger.debug('Raw response:', response);
      return this.noActionResult();
    }
  }

  /**
   * Returns a default "no action" result
   */
  private noActionResult(): ActionDetectionResult {
    return {
      requiresAction: false,
      actions: [
        {
          type: ActionType.NONE,
          confidence: 1.0,
          payload: null,
        },
      ],
    };
  }

  /**
   * Filters actions by minimum confidence threshold
   */
  filterByConfidence(
    result: ActionDetectionResult,
    minConfidence: number = 0.7,
  ): ActionDetectionResult {
    const filteredActions = result.actions.filter(
      (action) => action.confidence >= minConfidence,
    );

    return {
      requiresAction:
        filteredActions.length > 0 &&
        filteredActions.some((action) => action.type !== ActionType.NONE),
      actions: filteredActions,
    };
  }
}
