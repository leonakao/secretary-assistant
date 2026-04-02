import { describe, expect, it } from 'vitest';
import { ExtractAiMessageService } from './extract-ai-message.service';

describe('ExtractAiMessageService', () => {
  const service = new ExtractAiMessageService();

  it('ignores ai chunks with empty or whitespace-only string content', () => {
    expect(
      service.extractFromChunkMessages([
        {
          type: 'ai',
          content: '',
        },
      ]),
    ).toBe('');

    expect(
      service.extractFromChunkMessages([
        {
          type: 'ai',
          content: '   \n\t  ',
        },
      ]),
    ).toBe('');
  });

  it('normalizes structured ai text content blocks', () => {
    expect(
      service.extractFromChunkMessages([
        {
          type: 'ai',
          content: [
            { type: 'text', text: '  Primeira parte  ' },
            { type: 'text', text: '\nSegunda parte\n' },
          ],
        },
      ]),
    ).toBe('Primeira parte\nSegunda parte');
  });

  it('filters empty tool messages after normalization', () => {
    expect(
      service.extractToolMessagesFromChunkMessages([
        {
          type: 'tool',
          content: '   ',
        },
        {
          type: 'tool',
          content: 'Ferramenta executada',
        },
      ]),
    ).toEqual(['Ferramenta executada']);
  });
});
