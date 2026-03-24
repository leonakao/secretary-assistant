import { BaseMessage } from '@langchain/core/messages';
import { Messages } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';

export interface AssistantExtractionResult {
  messages: any[];
  lastMessage?: any;
  lastMessageText?: string;
}

@Injectable()
export class ExtractAiMessageService {
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

  public extractFromChunkMessages(messages: Messages | undefined): string {
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
      if (Array.isArray(content) && typeof content[0].text === 'string') {
        return content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
      }
    }
    return '';
  }
}
