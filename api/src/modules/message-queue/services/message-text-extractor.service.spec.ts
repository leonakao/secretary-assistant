import { describe, expect, it, vi } from 'vitest';
import { MessageTextExtractorService } from './message-text-extractor.service';

function makeService() {
  const audioTranscriptionService = {
    transcribeAudio: vi.fn().mockResolvedValue('audio transcribed'),
  } as any;

  return {
    service: new MessageTextExtractorService(audioTranscriptionService),
    audioTranscriptionService,
  };
}

describe('MessageTextExtractorService', () => {
  it('returns conversation text when present', async () => {
    const { service } = makeService();

    await expect(
      service.extract({
        message: {
          conversation: 'Oi',
        },
      } as any),
    ).resolves.toBe('Oi');
  });

  it('returns null for unsupported messages without text or audio', async () => {
    const { service, audioTranscriptionService } = makeService();

    await expect(
      service.extract({
        message: {
          imageMessage: {
            url: 'https://example.com/image.jpg',
            mimetype: 'image/jpeg',
          },
        },
      } as any),
    ).resolves.toBeNull();

    expect(audioTranscriptionService.transcribeAudio).not.toHaveBeenCalled();
  });
});
