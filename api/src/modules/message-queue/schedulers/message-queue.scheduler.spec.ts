import { describe, expect, it, vi } from 'vitest';
import { MessageQueueScheduler } from './message-queue.scheduler';
import { MessageQueueChannel } from '../entities/message-queue.entity';

function makeItem(overrides = {}) {
  return {
    id: 'item-1',
    channel: MessageQueueChannel.WHATSAPP,
    ...overrides,
  };
}

function makeScheduler(
  overrides: Partial<{
    messageQueueService: any;
    redisLockService: any;
    whatsappProcessor: any;
    webChatProcessor: any;
    configService: any;
  }> = {},
) {
  const messageQueueService = overrides.messageQueueService ?? {
    findReadyItems: vi.fn().mockResolvedValue([]),
    markProcessing: vi.fn().mockResolvedValue(undefined),
    markDone: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
  const redisLockService = overrides.redisLockService ?? {
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(undefined),
  };
  const whatsappProcessor = overrides.whatsappProcessor ?? {
    process: vi.fn().mockResolvedValue(undefined),
  };
  const webChatProcessor = overrides.webChatProcessor ?? {
    process: vi.fn().mockResolvedValue(undefined),
  };
  const configService = overrides.configService ?? {
    get: vi.fn().mockReturnValue(10000),
  };

  const scheduler = new MessageQueueScheduler(
    messageQueueService,
    redisLockService,
    whatsappProcessor,
    webChatProcessor,
    configService,
  );

  return {
    scheduler,
    messageQueueService,
    redisLockService,
    whatsappProcessor,
    webChatProcessor,
  };
}

describe('MessageQueueScheduler', () => {
  describe('processQueue', () => {
    it('does nothing when no ready items are found', async () => {
      const { scheduler, messageQueueService } = makeScheduler();

      await scheduler.processQueue();

      expect(messageQueueService.markProcessing).not.toHaveBeenCalled();
    });

    it('routes a whatsapp item to the whatsapp processor and marks it done', async () => {
      const item = makeItem({ channel: MessageQueueChannel.WHATSAPP });
      const { scheduler, whatsappProcessor, messageQueueService } =
        makeScheduler({
          messageQueueService: {
            findReadyItems: vi.fn().mockResolvedValue([item]),
            markProcessing: vi.fn().mockResolvedValue(undefined),
            markDone: vi.fn().mockResolvedValue(undefined),
            markFailed: vi.fn().mockResolvedValue(undefined),
          },
        });

      await scheduler.processQueue();

      expect(whatsappProcessor.process).toHaveBeenCalledWith(item);
      expect(messageQueueService.markProcessing).toHaveBeenCalledWith('item-1');
      expect(messageQueueService.markDone).toHaveBeenCalledWith('item-1');
    });

    it('routes a web_chat item to the web chat processor', async () => {
      const item = makeItem({ channel: MessageQueueChannel.WEB_CHAT });
      const { scheduler, webChatProcessor, whatsappProcessor } = makeScheduler({
        messageQueueService: {
          findReadyItems: vi.fn().mockResolvedValue([item]),
          markProcessing: vi.fn().mockResolvedValue(undefined),
          markDone: vi.fn().mockResolvedValue(undefined),
          markFailed: vi.fn().mockResolvedValue(undefined),
        },
      });

      await scheduler.processQueue();

      expect(webChatProcessor.process).toHaveBeenCalledWith(item);
      expect(whatsappProcessor.process).not.toHaveBeenCalled();
    });

    it('skips an item when the Redis lock cannot be acquired (another instance holds it)', async () => {
      const item = makeItem();
      const { scheduler, whatsappProcessor, messageQueueService } =
        makeScheduler({
          messageQueueService: {
            findReadyItems: vi.fn().mockResolvedValue([item]),
            markProcessing: vi.fn().mockResolvedValue(undefined),
            markDone: vi.fn().mockResolvedValue(undefined),
            markFailed: vi.fn().mockResolvedValue(undefined),
          },
          redisLockService: {
            acquireLock: vi.fn().mockResolvedValue(false),
            releaseLock: vi.fn().mockResolvedValue(undefined),
          },
        });

      await scheduler.processQueue();

      expect(whatsappProcessor.process).not.toHaveBeenCalled();
      expect(messageQueueService.markProcessing).not.toHaveBeenCalled();
    });

    it('marks item as failed when the processor throws', async () => {
      const item = makeItem();
      const { scheduler, messageQueueService } = makeScheduler({
        messageQueueService: {
          findReadyItems: vi.fn().mockResolvedValue([item]),
          markProcessing: vi.fn().mockResolvedValue(undefined),
          markDone: vi.fn().mockResolvedValue(undefined),
          markFailed: vi.fn().mockResolvedValue(undefined),
        },
        whatsappProcessor: {
          process: vi
            .fn()
            .mockRejectedValue(new Error('AI service unavailable')),
        },
      });

      await scheduler.processQueue();

      expect(messageQueueService.markFailed).toHaveBeenCalledWith('item-1');
      expect(messageQueueService.markDone).not.toHaveBeenCalled();
    });

    it('always releases the Redis lock, even when processing fails', async () => {
      const item = makeItem();
      const { scheduler, redisLockService } = makeScheduler({
        messageQueueService: {
          findReadyItems: vi.fn().mockResolvedValue([item]),
          markProcessing: vi.fn().mockResolvedValue(undefined),
          markDone: vi.fn().mockResolvedValue(undefined),
          markFailed: vi.fn().mockResolvedValue(undefined),
        },
        whatsappProcessor: {
          process: vi.fn().mockRejectedValue(new Error('boom')),
        },
      });

      await scheduler.processQueue();

      expect(redisLockService.releaseLock).toHaveBeenCalledWith(
        'queue-lock:item-1',
      );
    });

    it('processes multiple ready items independently', async () => {
      const items = [
        makeItem({ id: 'item-1', channel: MessageQueueChannel.WHATSAPP }),
        makeItem({ id: 'item-2', channel: MessageQueueChannel.WEB_CHAT }),
      ];
      const { scheduler, whatsappProcessor, webChatProcessor } = makeScheduler({
        messageQueueService: {
          findReadyItems: vi.fn().mockResolvedValue(items),
          markProcessing: vi.fn().mockResolvedValue(undefined),
          markDone: vi.fn().mockResolvedValue(undefined),
          markFailed: vi.fn().mockResolvedValue(undefined),
        },
      });

      await scheduler.processQueue();

      expect(whatsappProcessor.process).toHaveBeenCalledWith(items[0]);
      expect(webChatProcessor.process).toHaveBeenCalledWith(items[1]);
    });

    it('uses WHATSAPP_DEBOUNCE_MS from config when querying ready items', async () => {
      const messageQueueService = {
        findReadyItems: vi.fn().mockResolvedValue([]),
        markProcessing: vi.fn(),
        markDone: vi.fn(),
        markFailed: vi.fn(),
      };
      const { scheduler } = makeScheduler({
        messageQueueService,
        configService: { get: vi.fn().mockReturnValue(5000) },
      });

      await scheduler.processQueue();

      expect(messageQueueService.findReadyItems).toHaveBeenCalledWith(5000);
    });
  });
});
