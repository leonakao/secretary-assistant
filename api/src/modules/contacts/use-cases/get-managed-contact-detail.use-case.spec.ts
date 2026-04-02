import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetManagedContactDetailUseCase } from './get-managed-contact-detail.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeUserCompany() {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    company: {
      id: 'company-1',
      step: 'running',
    },
  };
}

describe('GetManagedContactDetailUseCase', () => {
  it('returns the selected contact with chronological conversation history', async () => {
    const contactSessionService = {
      findConversationMemories: vi.fn().mockResolvedValue([
        {
          id: 'memory-2',
          role: 'assistant',
          content: 'Olá, em que posso ajudar?',
          createdAt: new Date('2026-03-21T10:05:00.000Z'),
        },
        {
          id: 'memory-1',
          role: 'user',
          content: 'Preciso de um orçamento',
          createdAt: new Date('2026-03-21T10:00:00.000Z'),
        },
      ]),
    } as any;
    const useCase = new GetManagedContactDetailUseCase(
      {
        findOne: vi.fn().mockResolvedValue({
          id: 'contact-1',
          companyId: 'company-1',
          name: 'Alice',
          phone: '+5511999999999',
          email: null,
          instagram: null,
          ignoreUntil: null,
          preferredUserId: null,
        }),
      } as any,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      contactSessionService,
    );

    const result = await useCase.execute(makeUser(), 'contact-1');

    expect(result.contact.id).toBe('contact-1');
    expect(result.conversation.messages.map((message) => message.id)).toEqual([
      'memory-1',
      'memory-2',
    ]);
    expect(result.conversation.hasMore).toBe(false);
  });

  it('returns empty history when the contact has no phone', async () => {
    const contactSessionService = {
      findConversationMemories: vi.fn().mockResolvedValue([]),
    } as any;
    const useCase = new GetManagedContactDetailUseCase(
      {
        findOne: vi.fn().mockResolvedValue({
          id: 'contact-1',
          companyId: 'company-1',
          name: 'Alice',
          phone: null,
          email: null,
          instagram: null,
          ignoreUntil: null,
          preferredUserId: null,
        }),
      } as any,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      contactSessionService,
    );

    const result = await useCase.execute(makeUser(), 'contact-1');

    expect(result.conversation.messages).toEqual([]);
    expect(result.conversation.hasMore).toBe(false);
  });

  it('throws when the contact is outside the managed company', async () => {
    const useCase = new GetManagedContactDetailUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findConversationMemories: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), 'contact-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
