import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EvolutionWebhookController } from './evolution-webhook.controller';

function makeController(
  overrides: Partial<{
    messageQueueService: any;
    configService: any;
  }> = {},
) {
  const messageQueueService = overrides.messageQueueService ?? {
    enqueueWhatsapp: vi.fn().mockResolvedValue({ id: 'item-1' }),
  };
  const configService = overrides.configService ?? {
    get: vi.fn().mockReturnValue('secret-token'),
  };

  return {
    controller: new EvolutionWebhookController(
      messageQueueService,
      configService,
    ),
    messageQueueService,
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
    it('returns { success: true } immediately without invoking AI processing', async () => {
      const { controller } = makeController();

      const result = await controller.handleMessages(
        'company-1',
        'secret-token',
        makePayload(),
      );

      expect(result).toEqual({ success: true });
    });

    it('enqueues the message to message_queue without a synchronous AI call', async () => {
      const { controller, messageQueueService } = makeController();

      await controller.handleMessages(
        'company-1',
        'secret-token',
        makePayload(),
      );

      expect(messageQueueService.enqueueWhatsapp).toHaveBeenCalledOnce();
      expect(messageQueueService.enqueueWhatsapp).toHaveBeenCalledWith(
        'company-1',
        expect.any(String),
        expect.objectContaining({ instanceName: 'instance-1' }),
      );
    });

    it('builds conversation key as whatsapp:{companyId}:+{phone} from remoteJid', async () => {
      const { controller, messageQueueService } = makeController();

      await controller.handleMessages(
        'company-1',
        'secret-token',
        makePayload('551199999999@s.whatsapp.net'),
      );

      expect(messageQueueService.enqueueWhatsapp).toHaveBeenCalledWith(
        'company-1',
        'whatsapp:company-1:+551199999999',
        expect.anything(),
      );
    });

    it('includes full Evolution payload in the queued message', async () => {
      const { controller, messageQueueService } = makeController();
      const payload = makePayload();

      await controller.handleMessages('company-1', 'secret-token', payload);

      expect(messageQueueService.enqueueWhatsapp).toHaveBeenCalledWith(
        'company-1',
        expect.any(String),
        { instanceName: 'instance-1', payload: payload.data },
      );
    });

    it('rejects invalid tokens with UnauthorizedException', async () => {
      const { controller } = makeController();

      await expect(
        controller.handleMessages('company-1', 'wrong-token', makePayload()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('skips token check when EVOLUTION_API_TOKEN is not configured', async () => {
      const { controller, messageQueueService } = makeController({
        configService: { get: vi.fn().mockReturnValue(undefined) },
      });

      const result = await controller.handleMessages(
        'company-1',
        undefined,
        makePayload(),
      );

      expect(result).toEqual({ success: true });
      expect(messageQueueService.enqueueWhatsapp).toHaveBeenCalled();
    });
  });
});
