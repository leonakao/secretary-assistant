import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MessageQueueService } from './message-queue.service';
import {
  MessageQueueChannel,
  MessageQueueStatus,
} from '../entities/message-queue.entity';

function makeQueueItem(overrides = {}) {
  return {
    id: 'item-1',
    companyId: 'company-1',
    conversationKey: 'whatsapp:company-1:+551199999999',
    channel: MessageQueueChannel.WHATSAPP,
    messages: [],
    status: MessageQueueStatus.PENDING,
    enqueuedAt: new Date('2026-04-01T10:00:00.000Z'),
    lastMessageAt: new Date('2026-04-01T10:00:00.000Z'),
    processedAt: null,
    ...overrides,
  };
}

function makeRepo(overrides = {}) {
  return {
    query: vi.fn().mockResolvedValue([makeQueueItem()]),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data: any) => data),
    save: vi
      .fn()
      .mockImplementation(async (data: any) => ({ id: 'item-new', ...data })),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: vi.fn(),
    ...overrides,
  };
}

function makeService(repo = makeRepo()) {
  return { service: new MessageQueueService(repo as any), repo };
}

describe('MessageQueueService', () => {
  describe('enqueueWhatsapp', () => {
    it('inserts a new pending row for a first message from a conversation key', async () => {
      const repo = makeRepo();
      const { service } = makeService(repo);

      const result = await service.enqueueWhatsapp(
        'company-1',
        'whatsapp:company-1:+551199999999',
        {
          instanceName: 'instance-1',
          payload: { key: { remoteJid: '551199999999@s.whatsapp.net' } },
        },
      );

      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_queue'),
        expect.arrayContaining([
          'company-1',
          'whatsapp:company-1:+551199999999',
        ]),
      );
      expect(result.id).toBe('item-1');
    });

    it('appends to existing pending row via ON CONFLICT upsert when key is already pending', async () => {
      const repo = makeRepo({
        query: vi.fn().mockResolvedValue([makeQueueItem()]),
      });
      const { service } = makeService(repo);

      await service.enqueueWhatsapp(
        'company-1',
        'whatsapp:company-1:+551199999999',
        {
          instanceName: 'instance-1',
          payload: { key: { remoteJid: '551199999999@s.whatsapp.net' } },
        },
      );

      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.anything(),
      );
      // The upsert appends messages via DO UPDATE SET messages = ... || EXCLUDED.messages
      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.anything(),
      );
    });

    it('creates a new row when previous entry has status done (partial-index conflict only matches pending)', async () => {
      // When status = 'done', the partial index WHERE status = 'pending' does not match
      // → a fresh row is inserted instead of appending
      const newRow = makeQueueItem({ id: 'item-2' });
      const repo = makeRepo({ query: vi.fn().mockResolvedValue([newRow]) });
      const { service } = makeService(repo);

      const result = await service.enqueueWhatsapp(
        'company-1',
        'whatsapp:company-1:+551199999999',
        {
          instanceName: 'instance-1',
          payload: { key: { remoteJid: '551199999999@s.whatsapp.net' } },
        },
      );

      expect(result.id).toBe('item-2');
    });
  });

  describe('enqueueWebChat', () => {
    it('creates a new web_chat queue item when no pending item exists', async () => {
      const savedItem = {
        ...makeQueueItem({ channel: MessageQueueChannel.WEB_CHAT }),
        id: 'item-new',
      };
      const repo = makeRepo({
        findOne: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((data: any) => data),
        save: vi.fn().mockResolvedValue(savedItem),
      });
      const { service } = makeService(repo);

      const result = await service.enqueueWebChat(
        'company-1',
        'web_chat:company-1:user-1',
        { userId: 'user-1', text: 'Hello' },
      );

      expect(result.id).toBe('item-new');
    });

    it('throws ConflictException when a pending item exists for the same conversation key', async () => {
      const repo = makeRepo({
        findOne: vi
          .fn()
          .mockResolvedValue(
            makeQueueItem({ status: MessageQueueStatus.PENDING }),
          ),
      });
      const { service } = makeService(repo);

      await expect(
        service.enqueueWebChat('company-1', 'web_chat:company-1:user-1', {
          userId: 'user-1',
          text: 'Hello again',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when a processing item exists for the same conversation key', async () => {
      const repo = makeRepo({
        findOne: vi
          .fn()
          .mockResolvedValue(
            makeQueueItem({ status: MessageQueueStatus.PROCESSING }),
          ),
      });
      const { service } = makeService(repo);

      await expect(
        service.enqueueWebChat('company-1', 'web_chat:company-1:user-1', {
          userId: 'user-1',
          text: 'Hello again',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows a new message once the previous item is done', async () => {
      const savedItem = { ...makeQueueItem(), id: 'item-done+1' };
      const repo = makeRepo({
        findOne: vi.fn().mockResolvedValue(null), // no pending/processing row
        create: vi.fn().mockImplementation((data: any) => data),
        save: vi.fn().mockResolvedValue(savedItem),
      });
      const { service } = makeService(repo);

      const result = await service.enqueueWebChat(
        'company-1',
        'web_chat:company-1:user-1',
        { userId: 'user-1', text: 'New message' },
      );

      expect(result.id).toBe('item-done+1');
    });
  });

  describe('findReadyItems', () => {
    it('queries for pending items where lastMessageAt is older than the debounce window', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([makeQueueItem()]),
      };
      const repo = makeRepo({
        createQueryBuilder: vi.fn().mockReturnValue(mockQB),
      });
      const { service } = makeService(repo);

      const items = await service.findReadyItems(10000);

      expect(mockQB.where).toHaveBeenCalledWith('mq.status = :status', {
        status: MessageQueueStatus.PENDING,
      });
      expect(mockQB.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('10000 ms'),
      );
      expect(items).toHaveLength(1);
    });

    it('returns no items when all pending items are still within the debounce window', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      const repo = makeRepo({
        createQueryBuilder: vi.fn().mockReturnValue(mockQB),
      });
      const { service } = makeService(repo);

      const items = await service.findReadyItems(10000);

      expect(items).toHaveLength(0);
    });

    it('embeds the debounce interval value in the query', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      const repo = makeRepo({
        createQueryBuilder: vi.fn().mockReturnValue(mockQB),
      });
      const { service } = makeService(repo);

      await service.findReadyItems(5000);

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('5000 ms'),
      );
    });
  });
});
