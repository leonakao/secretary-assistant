import { AIMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { LangchainService } from './langchain.service';

describe('LangchainService', () => {
  it('extracts text from structured content blocks returned by the model', async () => {
    const invoke = vi.fn().mockResolvedValue(
      new AIMessage({
        content: [
          {
            type: 'output_text',
            text: '# Luna Clean\n\n## Sobre a Empresa\n- Atendimento via WhatsApp',
            annotations: [],
          },
        ],
      }),
    );
    const llmModelService = {
      getLlmModel: vi.fn(() => ({
        invoke,
      })),
    };
    const service = new LangchainService(llmModelService as never);

    await expect(service.chat('gere markdown')).resolves.toBe(
      '# Luna Clean\n\n## Sobre a Empresa\n- Atendimento via WhatsApp',
    );
  });

  it('concatenates streamed structured content without serializing annotations', async () => {
    const stream = vi.fn().mockResolvedValue(
      (async function* () {
        yield new AIMessage({
          content: [
            {
              type: 'output_text',
              text: '# Luna Clean\n',
              annotations: [],
            },
          ],
        });
        yield new AIMessage({
          content: [
            {
              type: 'output_text',
              text: '\n## Contato\n- atendimento@lunaclean.test',
              annotations: [],
            },
          ],
        });
      })(),
    );
    const llmModelService = {
      getLlmModel: vi.fn(() => ({
        invoke: vi.fn(),
        stream,
      })),
    };
    const service = new LangchainService(llmModelService as never);

    const chunks: string[] = [];
    for await (const chunk of service.streamChat('gere markdown')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      '# Luna Clean\n',
      '\n## Contato\n- atendimento@lunaclean.test',
    ]);
  });
});
