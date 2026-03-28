import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __private__,
  generateInterviewAnswer,
} from './interview-answer-agent';

describe('interview-answer-agent helpers', () => {
  it('extracts output_text when present', () => {
    expect(
      __private__.extractOutputText({
        output_text: 'Resposta gerada',
      }),
    ).toBe('Resposta gerada');
  });

  it('extracts message content text when output_text is absent', () => {
    expect(
      __private__.extractOutputText({
        output: [
          {
            content: [{ type: 'output_text', text: 'Linha 1' }, { type: 'text', text: 'Linha 2' }],
          },
        ],
      }),
    ).toBe('Linha 1\n\nLinha 2');
  });

  it('extracts provider error messages', () => {
    expect(
      __private__.extractErrorMessage({
        error: {
          message: 'quota exceeded',
        },
      }),
    ).toBe('quota exceeded');
  });

  it('returns deterministic fallback answers for trivial confirmation prompts', () => {
    expect(
      __private__.resolveFallbackAnswer(
        'Perfeito — posso contar com você para detalhar da melhor maneira possível cada uma das próximas perguntas?',
      ),
    ).toBe('Sim, posso detalhar as próximas perguntas com base no briefing.');

    expect(
      __private__.resolveFallbackAnswer('Você está pronto para começar?'),
    ).toBe('Sim, estou pronto para começar.');
  });
});

describe('generateInterviewAnswer', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
  });

  it('requires OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      generateInterviewAnswer({
        briefingMarkdown: '# briefing',
        question: 'Qual e o telefone?',
      }),
    ).rejects.toThrow('OPENAI_API_KEY is required');
  });

  it('returns the generated answer and model', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: 'O telefone principal e +55 11 4000-1234.',
      }),
    }) as typeof fetch;

    await expect(
      generateInterviewAnswer({
        briefingMarkdown: '# briefing',
        question: 'Qual e o telefone?',
      }),
    ).resolves.toEqual({
      answer: 'O telefone principal e +55 11 4000-1234.',
      model: 'gpt-5-nano',
    });
  });

  it('uses a fallback answer when the provider returns an empty payload for a confirmation prompt', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [],
      }),
    }) as typeof fetch;

    await expect(
      generateInterviewAnswer({
        briefingMarkdown: '# briefing',
        question:
          'Perfeito — posso contar com você para detalhar da melhor maneira possível cada uma das próximas perguntas?',
      }),
    ).resolves.toEqual({
      answer: 'Sim, posso detalhar as próximas perguntas com base no briefing.',
      model: 'gpt-5-nano:fallback',
    });
  });
});
