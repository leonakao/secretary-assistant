import { describe, expect, it, vi } from 'vitest';
import { WhatsappQueueProcessorService } from './whatsapp-queue-processor.service';
import {
  MessageQueueChannel,
  MessageQueueStatus,
} from '../entities/message-queue.entity';

function makeQueueItem(overrides: Partial<any> = {}) {
  return {
    id: 'queue-1',
    companyId: 'company-1',
    conversationKey: 'whatsapp:company-1:+551199999999',
    channel: MessageQueueChannel.WHATSAPP,
    status: MessageQueueStatus.PENDING,
    enqueuedAt: new Date('2026-04-01T10:00:00.000Z'),
    lastMessageAt: new Date('2026-04-01T10:00:00.000Z'),
    processedAt: null,
    messages: [
      {
        instanceName: 'instance-1',
        route: {
          kind: 'client' as const,
          contactId: 'contact-1',
        },
        payload: {
          key: {
            remoteJid: '551199999999@s.whatsapp.net',
          },
          message: {},
        },
      },
    ],
    ...overrides,
  };
}

function makeService(overrides: Partial<any> = {}) {
  const messageTextExtractorService = {
    extract: vi.fn().mockResolvedValue(null),
    ...overrides.messageTextExtractorService,
  };
  const processIncomingWhatsappMessage = {
    execute: vi.fn(),
    ...overrides.processIncomingWhatsappMessage,
  };
  const evolutionService = {
    sendPresence: vi.fn(),
    ...overrides.evolutionService,
  };

  return {
    service: new WhatsappQueueProcessorService(
      messageTextExtractorService,
      processIncomingWhatsappMessage,
      evolutionService,
    ),
    messageTextExtractorService,
    processIncomingWhatsappMessage,
    evolutionService,
  };
}

describe('WhatsappQueueProcessorService', () => {
  it('ignores queue items with no processable messages', async () => {
    const { service, processIncomingWhatsappMessage, evolutionService } =
      makeService();

    await service.process(makeQueueItem());

    expect(processIncomingWhatsappMessage.execute).not.toHaveBeenCalled();
    expect(evolutionService.sendPresence).not.toHaveBeenCalled();
  });

  it('processes queue items when at least one text message is extracted', async () => {
    const { service, processIncomingWhatsappMessage, evolutionService } =
      makeService({
        messageTextExtractorService: {
          extract: vi.fn().mockResolvedValue('Oi'),
        },
      });

    await service.process(makeQueueItem());

    expect(evolutionService.sendPresence).toHaveBeenNthCalledWith(1, {
      instanceName: 'instance-1',
      remoteJid: '551199999999@s.whatsapp.net',
      presence: 'composing',
    });
    expect(processIncomingWhatsappMessage.execute).toHaveBeenCalledWith({
      companyId: 'company-1',
      instanceName: 'instance-1',
      remoteJid: '551199999999@s.whatsapp.net',
      message: 'Oi',
      route: { kind: 'client', contactId: 'contact-1' },
    });
    expect(evolutionService.sendPresence).toHaveBeenNthCalledWith(2, {
      instanceName: 'instance-1',
      remoteJid: '551199999999@s.whatsapp.net',
      presence: 'paused',
    });
  });
});
