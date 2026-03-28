import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateManagedCompanyProfileUseCase } from './update-managed-company-profile.use-case';

function makeUser() {
  return { id: 'user-1' } as any;
}

function makeUserCompany() {
  return {
    userId: 'user-1',
    companyId: 'company-1',
    company: {
      id: 'company-1',
      name: 'Acme',
      businessType: 'Old Type',
      description: '# Existing knowledge',
      step: 'running',
      updatedAt: new Date('2026-03-28T12:00:00.000Z'),
    },
  };
}

describe('UpdateManagedCompanyProfileUseCase', () => {
  it('updates only name and businessType', async () => {
    const companyRepository = {
      save: vi.fn().mockImplementation(async (payload) => payload),
    } as any;
    const useCase = new UpdateManagedCompanyProfileUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      companyRepository,
    );

    const result = await useCase.execute(makeUser(), {
      name: 'Acme Updated',
      businessType: 'New Type',
    });

    expect(companyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Updated',
        businessType: 'New Type',
        description: '# Existing knowledge',
      }),
    );
    expect(result.company.description).toBe('# Existing knowledge');
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new UpdateManagedCompanyProfileUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { save: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        name: 'Acme',
        businessType: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the user is linked only as employee', async () => {
    const useCase = new UpdateManagedCompanyProfileUseCase(
      {
        findOne: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'relation-employee',
            userId: 'user-1',
            companyId: 'company-1',
            role: 'employee',
          }),
      } as any,
      { save: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), {
        name: 'Acme',
        businessType: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
