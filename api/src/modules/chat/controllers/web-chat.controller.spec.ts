import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { WebChatController } from './web-chat.controller';
import { MessageQueueChannel } from '../../message-queue/entities/message-queue.entity';

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
    enqueueMessage: vi.fn().mockResolvedValue({ id: 'item-1' }),
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

      expect(messageQueueService.enqueueMessage).toHaveBeenCalledWith({
        companyId: 'company-1',
        conversationKey: 'web_chat:company-1:user-1',
        channel: MessageQueueChannel.WEB_CHAT,
        message: { userId: 'user-1', text: 'Hello' },
      });
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

    it('does not call enqueueMessage when company membership check fails', async () => {
      const messageQueueService = { enqueueMessage: vi.fn() };
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

      expect(messageQueueService.enqueueMessage).not.toHaveBeenCalled();
    });
  });
});
