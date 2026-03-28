import { BaseMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';

export interface AssistantExtractionResult {
  messages: any[];
  lastMessage?: any;
  lastMessageText?: string;
}

@Injectable()
export class ExtractAiMessageService {
  private isTextContentPart(
    value: unknown,
  ): value is { type: 'text'; text: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'text' &&
      'text' in value &&
      typeof value.text === 'string'
    );
  }

  private isBaseMessage(value: unknown): value is BaseMessage {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'type' in value &&
      typeof (value as BaseMessage).type === 'string' &&
      'content' in value
    );
  }

  public extractFromChunkMessages(messages: unknown[] | undefined): string {
    if (!messages) {
      return '';
    }

    if (!Array.isArray(messages)) {
      return '';
    }

    const lastMessage = messages[messages.length - 1];

    if (!this.isBaseMessage(lastMessage)) {
      return '';
    }

    if (lastMessage.type === 'ai') {
      const content = lastMessage.content;
      if (typeof content === 'string') {
        return content;
      }
      if (
        Array.isArray(content) &&
        content.some((part) => this.isTextContentPart(part))
      ) {
        return content
          .filter((part) => this.isTextContentPart(part))
          .map((part) => part.text)
          .join('\n');
      }
    }
    return '';
  }
}
