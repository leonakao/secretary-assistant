import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateManagedContactIgnoreUntilUseCase } from './update-managed-contact-ignore-until.use-case';

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

function makeContact() {
  return {
    id: 'contact-1',
    companyId: 'company-1',
    name: 'Alice',
    phone: '+5511999999999',
    email: null,
    instagram: null,
    ignoreUntil: null,
    preferredUserId: null,
  };
}

describe('UpdateManagedContactIgnoreUntilUseCase', () => {
  it('clears ignoreUntil when the payload is null', async () => {
    const contactRepository = {
      findOne: vi.fn().mockResolvedValue(makeContact()),
      save: vi.fn().mockImplementation(async (value) => value),
    } as any;
    const useCase = new UpdateManagedContactIgnoreUntilUseCase(
      contactRepository,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findLatestMemoryForContact: vi.fn().mockResolvedValue(null) } as any,
    );

    const result = await useCase.execute(makeUser(), 'contact-1', {
      ignoreUntil: null,
    });

    expect(contactRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreUntil: null }),
    );
    expect(result.contact.ignoreUntil).toBeNull();
  });

  it('accepts a future ignoreUntil value and keeps lastInteractionAt', async () => {
    const futureDate = '2099-01-01T00:00:00.000Z';
    const contactRepository = {
      findOne: vi.fn().mockResolvedValue(makeContact()),
      save: vi.fn().mockImplementation(async (value) => value),
    } as any;
    const useCase = new UpdateManagedContactIgnoreUntilUseCase(
      contactRepository,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      {
        findLatestMemoryForContact: vi.fn().mockResolvedValue({
          createdAt: new Date('2098-12-31T12:00:00.000Z'),
        }),
      } as any,
    );

    const result = await useCase.execute(makeUser(), 'contact-1', {
      ignoreUntil: futureDate,
    });

    expect(result.contact.ignoreUntil).toEqual(new Date(futureDate));
    expect(result.contact.isIgnored).toBe(true);
    expect(result.contact.lastInteractionAt).toEqual(
      new Date('2098-12-31T12:00:00.000Z'),
    );
  });

  it('rejects past ignoreUntil values', async () => {
    const useCase = new UpdateManagedContactIgnoreUntilUseCase(
      {
        findOne: vi.fn().mockResolvedValue(makeContact()),
        save: vi.fn(),
      } as any,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findLatestMemoryForContact: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), 'contact-1', {
        ignoreUntil: '2020-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the contact does not belong to the company', async () => {
    const useCase = new UpdateManagedContactIgnoreUntilUseCase(
      {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn(),
      } as any,
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      { findLatestMemoryForContact: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), 'contact-1', { ignoreUntil: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
