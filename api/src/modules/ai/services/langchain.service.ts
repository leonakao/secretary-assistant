import { Injectable } from '@nestjs/common';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { LlmChatModel, LlmModelService } from './llm-model.service';

@Injectable()
export class LangchainService {
  private readonly model: LlmChatModel;

  constructor(private readonly llmModelService: LlmModelService) {
    this.model = this.llmModelService.getLlmModel('helper');
  }

  /**
   * Get the configured helper model instance
   */
  getModel(): LlmChatModel {
    return this.model;
  }

  /**
   * Send a simple message to the AI
   */
  async chat(message: string, maxTokens?: number): Promise<string> {
    const model = maxTokens
      ? this.createHelperModelWithMaxTokens(maxTokens)
      : this.model;

    const response = await model.invoke([new HumanMessage(message)]);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }

  /**
   * Send a message with system context
   */
  async chatWithContext(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ];

    const response = await this.model.invoke(messages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }

  /**
   * Continue a conversation with message history
   */
  async chatWithHistory(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const langchainMessages = messages.map((msg) => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          throw new Error('Unknown message role');
      }
    });

    const response = await this.model.invoke(langchainMessages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }

  /**
   * Stream a response from the AI
   */
  async *streamChat(message: string): AsyncGenerator<string> {
    const stream = await this.model.stream([new HumanMessage(message)]);

    for await (const chunk of stream) {
      if (chunk.content) {
        yield typeof chunk.content === 'string'
          ? chunk.content
          : JSON.stringify(chunk.content);
      }
    }
  }

  private createHelperModelWithMaxTokens(maxTokens: number): LlmChatModel {
    const model = this.llmModelService.getLlmModel('helper');
    model.maxTokens = maxTokens;
    return model;
  }
}
