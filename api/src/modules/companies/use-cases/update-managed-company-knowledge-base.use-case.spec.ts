import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateManagedCompanyKnowledgeBaseUseCase } from './update-managed-company-knowledge-base.use-case';

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
      businessType: 'Dental Clinic',
      description: '# Existing knowledge',
      step: 'running',
      updatedAt: new Date('2026-03-28T12:00:00.000Z'),
    },
  };
}

describe('UpdateManagedCompanyKnowledgeBaseUseCase', () => {
  it('updates only description', async () => {
    const companyRepository = {
      save: vi.fn().mockImplementation(async (payload) => payload),
    } as any;
    const useCase = new UpdateManagedCompanyKnowledgeBaseUseCase(
      { findOne: vi.fn().mockResolvedValue(makeUserCompany()) } as any,
      companyRepository,
    );

    const result = await useCase.execute(makeUser(), {
      markdown: '# Updated knowledge',
    });

    expect(companyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme',
        businessType: 'Dental Clinic',
        description: '# Updated knowledge',
      }),
    );
    expect(result.company.name).toBe('Acme');
  });

  it('throws when the user has no managed company', async () => {
    const useCase = new UpdateManagedCompanyKnowledgeBaseUseCase(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      { save: vi.fn() } as any,
    );

    await expect(
      useCase.execute(makeUser(), { markdown: '# Updated knowledge' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the user is linked only as employee', async () => {
    const useCase = new UpdateManagedCompanyKnowledgeBaseUseCase(
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
      useCase.execute(makeUser(), { markdown: '# Updated knowledge' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
