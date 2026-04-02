import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListManagedContactsUseCase } from './list-managed-contacts.use-case';

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

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    companyId: 'company-1',
    name: 'Alice',
    phone: '+5511999999999',
    email: null,
    instagram: null,
    ignoreUntil: null,
    createdAt: new Date('2026-03-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('ListManagedContactsUseCase', () => {
  it('returns paginated contacts enriched with latest interaction', async () => {
    const contactRepository = {
      find: vi.fn().mockResolvedValue([makeContact()]),
    } as any;
    const userCompanyRepository = {
      findOne: vi.fn().mockResolvedValue(makeUserCompany()),
    } as any;
    const contactSessionService = {
      findLatestMemoryForContact: vi.fn().mockResolvedValue({
        id: 'memory-1',
        sessionId: 'contact:contact-1:session:2026-03-20T09:00:00.000Z',
        companyId: 'company-1',
        content: 'Última mensagem enviada pelo cliente',
        createdAt: new Date('2026-03-20T09:00:00.000Z'),
      }),
    } as any;

    const useCase = new ListManagedContactsUseCase(
      contactRepository,
      userCompanyRepository,
      contactSessionService,
    );

    const result = await useCase.execute(makeUser(), { page: 1, pageSize: 20 });

    expect(result).toEqual({
      contacts: [
        expect.objectContaining({
          id: 'contact-1',
          name: 'Alice',
          isIgnored: false,
          lastInteractionAt: new Date('2026-03-20T09:00:00.000Z'),
          lastInteractionPreview: 'Última mensagem enviada pelo cliente',
        }),
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it('orders globally by latest interaction before applying pagination', async () => {
    const contactRepository = {
      find: vi.fn().mockResolvedValue([
        makeContact({
          id: 'contact-without-interaction',
          name: 'Sem histórico',
          phone: '+5511000000000',
          createdAt: new Date('2026-03-10T09:00:00.000Z'),
        }),
        makeContact({
          id: 'contact-older-interaction',
          name: 'Interação antiga',
          phone: '+5511111111111',
          createdAt: new Date('2026-03-09T09:00:00.000Z'),
        }),
        makeContact({
          id: 'contact-latest-interaction',
          name: 'Interação recente',
          phone: '+5511222222222',
          createdAt: new Date('2026-03-08T09:00:00.000Z'),
        }),
      ]),
    } as any;
    const contactSessionService = {
      findLatestMemoryForContact: vi.fn(async ({ contactId }: any) => {
        if (contactId === 'contact-latest-interaction') {
          return {
            id: 'memory-latest',
            sessionId:
              'contact:contact-latest-interaction:session:2026-04-05T12:00:00.000Z',
            companyId: 'company-1',
            content: 'Mensagem mais recente',
            createdAt: new Date('2026-04-05T12:00:00.000Z'),
          };
        }

        if (contactId === 'contact-older-interaction') {
          return {
            id: 'memory-older',
            sessionId:
              'contact:contact-older-interaction:session:2026-04-01T12:00:00.000Z',
            companyId: 'company-1',
            content: 'Mensagem antiga',
            createdAt: new Date('2026-04-01T12:00:00.000Z'),
          };
        }

        return null;
      }),
    } as any;
    const useCase = new ListManagedContactsUseCase(
      contactRepository,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      contactSessionService,
    );

    const firstPage = await useCase.execute(makeUser(), {
      page: 1,
      pageSize: 1,
    });
    const secondPage = await useCase.execute(makeUser(), {
      page: 2,
      pageSize: 1,
    });
    const thirdPage = await useCase.execute(makeUser(), {
      page: 3,
      pageSize: 1,
    });

    expect(firstPage.contacts.map((contact) => contact.id)).toEqual([
      'contact-latest-interaction',
    ]);
    expect(secondPage.contacts.map((contact) => contact.id)).toEqual([
      'contact-older-interaction',
    ]);
    expect(thirdPage.contacts.map((contact) => contact.id)).toEqual([
      'contact-without-interaction',
    ]);
  });

  it('uses deterministic fallback ordering for contacts without interaction', async () => {
    const contactRepository = {
      find: vi.fn().mockResolvedValue([
        makeContact({
          id: 'contact-b',
          name: 'Contato B',
          phone: null,
          createdAt: new Date('2026-03-11T09:00:00.000Z'),
        }),
        makeContact({
          id: 'contact-a',
          name: 'Contato A',
          phone: null,
          createdAt: new Date('2026-03-12T09:00:00.000Z'),
        }),
      ]),
    } as any;
    const useCase = new ListManagedContactsUseCase(
      contactRepository,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findLatestMemoryForContact: vi.fn().mockResolvedValue(null) } as any,
    );

    const result = await useCase.execute(makeUser(), { page: 1, pageSize: 20 });

    expect(result.contacts.map((contact) => contact.id)).toEqual([
      'contact-a',
      'contact-b',
    ]);
  });

  it('treats past ignoreUntil as not ignored', async () => {
    const contactRepository = {
      find: vi.fn().mockResolvedValue([
        makeContact({
          phone: null,
          ignoreUntil: new Date('2020-01-01T00:00:00.000Z'),
        }),
      ]),
    } as any;
    const useCase = new ListManagedContactsUseCase(
      contactRepository,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findLatestMemoryForContact: vi.fn().mockResolvedValue(null) } as any,
    );

    const result = await useCase.execute(makeUser(), { page: 1, pageSize: 20 });

    expect(result.contacts[0].isIgnored).toBe(false);
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new ListManagedContactsUseCase(
      { find: vi.fn() } as any,
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { findLatestMemoryForContact: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), { page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the user is linked only as employee', async () => {
    const useCase = new ListManagedContactsUseCase(
      { find: vi.fn() } as any,
      {
        findOne: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'relation-employee', role: 'employee' }),
      } as any,
      { findLatestMemoryForContact: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), { page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
