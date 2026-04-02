import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

export type LlmModelType = 'helper' | 'user-interaction';
export type LlmChatModel = ChatOpenAI;
export type LlmModelObservabilityMetadata = {
  ls_model_name: string;
  ls_provider: 'openai';
  ls_temperature?: number;
};

const MODEL_CONFIG: Record<
  LlmModelType,
  {
    model: string;
    maxTokens: number;
    reasoning: {
      effort: 'none' | 'low';
    };
  }
> = {
  helper: {
    model: 'gpt-5.4-nano',
    maxTokens: 8192,
    reasoning: {
      effort: 'none',
    },
  },
  'user-interaction': {
    model: 'gpt-5.4-mini',
    maxTokens: 2048,
    reasoning: {
      effort: 'low',
    },
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
      reasoning: config.reasoning,
      useResponsesApi: true,
    });
  }

  getObservabilityMetadata(model: LlmChatModel): LlmModelObservabilityMetadata {
    return {
      ls_model_name: model.model,
      ls_provider: 'openai',
      ...(typeof model.temperature === 'number'
        ? { ls_temperature: model.temperature }
        : {}),
    };
  }
}
