import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingMessagesController } from './onboarding-messages.controller';

function makeUser() {
  return { id: 'user-1' } as any;
}

describe('OnboardingMessagesController', () => {
  it('uses the uploaded file mime type as canonical audio mime type', async () => {
    const sendOnboardingMessage = { execute: vi.fn().mockResolvedValue({}) };
    const controller = new OnboardingMessagesController(
      { execute: vi.fn() } as any,
      sendOnboardingMessage as any,
    );

    await controller.sendMessage(
      makeUser(),
      {
        kind: 'audio',
        mimeType: 'audio/webm',
        durationMs: '1500',
      },
      {
        buffer: Buffer.from('audio'),
        mimetype: 'audio/webm',
      },
    );

    expect(sendOnboardingMessage.execute).toHaveBeenCalledWith(
      expect.anything(),
      {
        kind: 'audio',
        audioBuffer: Buffer.from('audio'),
        mimeType: 'audio/webm',
        durationMs: 1500,
      },
    );
  });

  it('rejects mismatched declared and uploaded mime types', async () => {
    const controller = new OnboardingMessagesController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await expect(
      controller.sendMessage(
        makeUser(),
        {
          kind: 'audio',
          mimeType: 'audio/ogg',
        },
        {
          buffer: Buffer.from('audio'),
          mimetype: 'audio/webm',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
