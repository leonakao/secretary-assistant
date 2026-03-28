import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetManagedCompanyUseCase } from './get-managed-company.use-case';

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
      businessType: 'Clínica odontológica',
      description: '# Acme',
      step: 'running',
      updatedAt: new Date('2026-03-28T12:00:00.000Z'),
    },
  };
}

describe('GetManagedCompanyUseCase', () => {
  it('returns the managed company payload', async () => {
    const userCompanyRepository = {
      findOne: vi.fn().mockResolvedValue(makeUserCompany()),
    } as any;
    const useCase = new GetManagedCompanyUseCase(userCompanyRepository);

    const result = await useCase.execute(makeUser());

    expect(userCompanyRepository.findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          company: { step: 'running' },
        }),
      }),
    );
    expect(result).toEqual({
      company: {
        id: 'company-1',
        name: 'Acme',
        businessType: 'Clínica odontológica',
        description: '# Acme',
        step: 'running',
        updatedAt: new Date('2026-03-28T12:00:00.000Z'),
      },
    });
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new GetManagedCompanyUseCase({
      findOne: vi.fn().mockResolvedValue(null),
    } as any);

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the user is linked only as employee', async () => {
    const useCase = new GetManagedCompanyUseCase({
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
    } as any);

    await expect(useCase.execute(makeUser())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
