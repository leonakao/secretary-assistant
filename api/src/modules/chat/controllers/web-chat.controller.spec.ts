import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { WebChatController } from './web-chat.controller';

function makeUser(overrides = {}) {
  return { id: 'user-1', name: 'Alice', ...overrides } as any;
}

function makeController(
  overrides: Partial<{
    userCompanyRepository: any;
    messageQueueService: any;
  }> = {},
) {
  const userCompanyRepository = overrides.userCompanyRepository ?? {
    findOne: vi
      .fn()
      .mockResolvedValue({ userId: 'user-1', companyId: 'company-1' }),
  };
  const messageQueueService = overrides.messageQueueService ?? {
    enqueueWebChat: vi.fn().mockResolvedValue({ id: 'item-1' }),
  };

  return {
    controller: new WebChatController(
      userCompanyRepository,
      messageQueueService,
    ),
    userCompanyRepository,
    messageQueueService,
  };
}

describe('WebChatController', () => {
  describe('POST /chat/messages', () => {
    it('returns 202 with pending status and the queue item id as userMessageId', async () => {
      const { controller } = makeController();

      const result = await controller.sendMessage(makeUser(), {
        companyId: 'company-1',
        message: 'Hello',
      });

      expect(result).toEqual({ status: 'pending', userMessageId: 'item-1' });
    });

    it('enqueues the message using a web_chat:{companyId}:{userId} conversation key', async () => {
      const { controller, messageQueueService } = makeController();

      await controller.sendMessage(makeUser(), {
        companyId: 'company-1',
        message: 'Hello',
      });

      expect(messageQueueService.enqueueWebChat).toHaveBeenCalledWith(
        'company-1',
        'web_chat:company-1:user-1',
        { userId: 'user-1', text: 'Hello' },
      );
    });

    it('throws ForbiddenException when user does not belong to the specified company', async () => {
      const { controller } = makeController({
        userCompanyRepository: {
          findOne: vi.fn().mockResolvedValue(null),
        },
      });

      await expect(
        controller.sendMessage(makeUser(), {
          companyId: 'other-company',
          message: 'Hello',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ConflictException when a message is already pending for the same conversation', async () => {
      const { controller } = makeController({
        messageQueueService: {
          enqueueWebChat: vi
            .fn()
            .mockRejectedValue(
              new ConflictException('A message is already pending'),
            ),
        },
      });

      await expect(
        controller.sendMessage(makeUser(), {
          companyId: 'company-1',
          message: 'Hello again',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not call enqueueWebChat when company membership check fails', async () => {
      const messageQueueService = { enqueueWebChat: vi.fn() };
      const { controller } = makeController({
        userCompanyRepository: { findOne: vi.fn().mockResolvedValue(null) },
        messageQueueService,
      });

      await expect(
        controller.sendMessage(makeUser(), {
          companyId: 'other-company',
          message: 'Hello',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(messageQueueService.enqueueWebChat).not.toHaveBeenCalled();
    });
  });
});
