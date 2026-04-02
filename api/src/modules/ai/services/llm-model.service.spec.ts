import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { LlmModelService } from './llm-model.service';

describe('LlmModelService', () => {
  const createConfigService = (apiKey?: string) =>
    ({
      get: vi.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? apiKey : undefined,
      ),
    }) as unknown as ConfigService;

  it('returns the configured helper model', () => {
    const service = new LlmModelService(createConfigService('test-key'));

    const model = service.getLlmModel('helper');

    expect(model).toBeInstanceOf(ChatOpenAI);
    expect(model.model).toBe('gpt-5.4-nano');
    expect(model.maxTokens).toBe(8192);
    expect(model.reasoning).toEqual({ effort: 'none' });
    expect(model.useResponsesApi).toBe(true);
  });

  it('returns the configured user interaction model', () => {
    const service = new LlmModelService(createConfigService('test-key'));

    const model = service.getLlmModel('user-interaction');

    expect(model).toBeInstanceOf(ChatOpenAI);
    expect(model.model).toBe('gpt-5.4-mini');
    expect(model.maxTokens).toBe(2048);
    expect(model.reasoning).toEqual({ effort: 'low' });
    expect(model.useResponsesApi).toBe(true);
  });

  it('throws when OPENAI_API_KEY is missing', () => {
    const service = new LlmModelService(createConfigService(undefined));

    expect(() => service.getLlmModel('helper')).toThrow(
      'OPENAI_API_KEY is not defined in environment variables',
    );
  });

  it('returns observability metadata for the configured model', () => {
    const service = new LlmModelService(createConfigService('test-key'));
    const model = service.getLlmModel('helper');

    expect(service.getObservabilityMetadata(model)).toEqual({
      context_window_tokens: 400000,
      ls_model_name: 'gpt-5.4-nano',
      ls_provider: 'openai',
      max_output_tokens: 8192,
    });
  });
});
