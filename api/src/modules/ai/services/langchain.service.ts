import { Injectable } from '@nestjs/common';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { LlmChatModel, LlmModelService } from './llm-model.service';
import { createLangWatchRunnableConfig } from 'src/observability/langwatch';

@Injectable()
export class LangchainService {
  private readonly model: LlmChatModel;
  private readonly modelMetadata;

  constructor(private readonly llmModelService: LlmModelService) {
    this.model = this.llmModelService.getLlmModel('helper');
    this.modelMetadata = this.llmModelService.getObservabilityMetadata(
      this.model,
    );
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

    const response = await model.invoke(
      [new HumanMessage(message)],
      createLangWatchRunnableConfig(undefined, {
        ...this.llmModelService.getObservabilityMetadata(model),
        operation: 'langchain_service.chat',
      }),
    );
    return this.extractTextContent(response.content);
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

    const response = await this.model.invoke(
      messages,
      createLangWatchRunnableConfig(undefined, {
        ...this.modelMetadata,
        operation: 'langchain_service.chat_with_context',
      }),
    );
    return this.extractTextContent(response.content);
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

    const response = await this.model.invoke(
      langchainMessages,
      createLangWatchRunnableConfig(undefined, {
        ...this.modelMetadata,
        operation: 'langchain_service.chat_with_history',
      }),
    );
    return this.extractTextContent(response.content);
  }

  /**
   * Stream a response from the AI
   */
  async *streamChat(message: string): AsyncGenerator<string> {
    const stream = await this.model.stream(
      [new HumanMessage(message)],
      createLangWatchRunnableConfig(undefined, {
        ...this.modelMetadata,
        operation: 'langchain_service.stream_chat',
      }),
    );

    for await (const chunk of stream) {
      if (chunk.content) {
        yield this.extractTextContent(chunk.content);
      }
    }
  }

  private createHelperModelWithMaxTokens(maxTokens: number): LlmChatModel {
    const model = this.llmModelService.getLlmModel('helper');
    model.maxTokens = maxTokens;
    return model;
  }

  private extractTextContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => this.extractTextContent(item))
        .filter((item) => item.trim().length > 0)
        .join('');
    }

    if (content && typeof content === 'object') {
      if ('text' in content && typeof content.text === 'string') {
        return content.text;
      }

      if ('content' in content) {
        return this.extractTextContent(content.content);
      }
    }

    return JSON.stringify(content);
  }
}
