import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

export type LlmModelType = 'helper' | 'user-interaction';
export type LlmChatModel = ChatOpenAI;

const MODEL_CONFIG: Record<
  LlmModelType,
  {
    model: string;
    maxTokens: number;
  }
> = {
  helper: {
    model: 'gpt-5-nano',
    maxTokens: 8192,
  },
  'user-interaction': {
    model: 'gpt-5-mini',
    maxTokens: 2048,
  },
};

@Injectable()
export class LlmModelService {
  constructor(private readonly configService: ConfigService) {}

  getLlmModel(type: LlmModelType): LlmChatModel {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    const config = MODEL_CONFIG[type];

    return new ChatOpenAI({
      apiKey,
      model: config.model,
      maxTokens: config.maxTokens,
      useResponsesApi: true,
    });
  }
}
