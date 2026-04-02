import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EvolutionWebhookController } from './evolution-webhook.controller';

function makeController(
  overrides: Partial<{
    incomingMessageUseCase: any;
    configService: any;
  }> = {},
) {
  const incomingMessageUseCase = overrides.incomingMessageUseCase ?? {
    execute: vi.fn().mockResolvedValue({
      success: true,
      ignored: false,
      ignoredReason: null,
    }),
  };
  const configService = overrides.configService ?? {
    get: vi.fn().mockReturnValue('secret-token'),
  };

  return {
    controller: new EvolutionWebhookController(
      incomingMessageUseCase,
      configService,
    ),
    incomingMessageUseCase,
    configService,
  };
}

function makePayload(remoteJid = '551199999999@s.whatsapp.net') {
  return {
    instance: 'instance-1',
    data: {
      key: { remoteJid, fromMe: false, id: 'msg-1' },
      message: { conversation: 'Hello' },
      messageType: 'conversation',
      messageTimestamp: 1700000000,
      pushName: 'Alice',
    },
  } as any;
}

describe('EvolutionWebhookController', () => {
  describe('POST /webhooks/evolution/:companyId/messages-upsert', () => {
    it('returns the result from the incoming message use case', async () => {
      const { controller } = makeController();

      const result = await controller.handleMessages(
        'company-1',
        'secret-token',
        makePayload(),
      );

      expect(result).toEqual({
        success: true,
        ignored: false,
        ignoredReason: null,
      });
    });

    it('delegates webhook handling to IncomingMessageUseCase', async () => {
      const { controller, incomingMessageUseCase } = makeController();

      await controller.handleMessages(
        'company-1',
        'secret-token',
        makePayload(),
      );

      expect(incomingMessageUseCase.execute).toHaveBeenCalledOnce();
      expect(incomingMessageUseCase.execute).toHaveBeenCalledWith(
        'company-1',
        'instance-1',
        expect.objectContaining({
          key: expect.objectContaining({
            remoteJid: '551199999999@s.whatsapp.net',
          }),
        }),
      );
    });

    it('passes the full Evolution data payload to the use case', async () => {
      const { controller, incomingMessageUseCase } = makeController();
      const payload = makePayload('551199999999@s.whatsapp.net');

      await controller.handleMessages('company-1', 'secret-token', payload);

      expect(incomingMessageUseCase.execute).toHaveBeenCalledWith(
        'company-1',
        'instance-1',
        payload.data,
      );
    });

    it('rejects invalid tokens with UnauthorizedException', async () => {
      const { controller } = makeController();

      await expect(
        controller.handleMessages('company-1', 'wrong-token', makePayload()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('skips token check when EVOLUTION_API_TOKEN is not configured', async () => {
      const { controller, incomingMessageUseCase } = makeController({
        configService: { get: vi.fn().mockReturnValue(undefined) },
      });

      const result = await controller.handleMessages(
        'company-1',
        undefined,
        makePayload(),
      );

      expect(result).toEqual({
        success: true,
        ignored: false,
        ignoredReason: null,
      });
      expect(incomingMessageUseCase.execute).toHaveBeenCalled();
    });

    it('returns ignored=true with reason when the message type is unsupported', async () => {
      const { controller, incomingMessageUseCase } = makeController({
        incomingMessageUseCase: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            ignored: true,
            ignoredReason: 'unsupported_message_type',
          }),
        },
      });

      const result = await controller.handleMessages(
        'company-1',
        'secret-token',
        {
          instance: 'instance-1',
          data: {
            key: {
              remoteJid: '551199999999@s.whatsapp.net',
              fromMe: false,
              id: 'msg-1',
            },
            message: {
              imageMessage: {
                url: 'https://example.com/image.jpg',
                mimetype: 'image/jpeg',
              },
            },
          },
        } as any,
      );

      expect(result).toEqual({
        success: true,
        ignored: true,
        ignoredReason: 'unsupported_message_type',
      });
      expect(incomingMessageUseCase.execute).toHaveBeenCalled();
    });
  });
});
