import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { findManagedUserCompany } from './find-managed-user-company';

function makeManagedUserCompany(role: 'owner' | 'admin' = 'owner') {
  return {
    id: `relation-${role}`,
    userId: 'user-1',
    companyId: 'company-1',
    role,
    company: {
      id: 'company-1',
      name: 'Acme',
      step: 'running',
    },
  };
}

describe('findManagedUserCompany', () => {
  it('prefers a running owner/admin company', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValueOnce(makeManagedUserCompany('owner')),
    } as any;

    const result = await findManagedUserCompany(repository, 'user-1');

    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(result).toEqual(makeManagedUserCompany('owner'));
  });

  it('falls back to the latest owner/admin relation when no running company exists', async () => {
    const repository = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeManagedUserCompany('admin')),
    } as any;

    const result = await findManagedUserCompany(repository, 'user-1');

    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(result).toEqual(makeManagedUserCompany('admin'));
  });

  it('throws when the user is linked only as employee', async () => {
    const repository = {
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
    } as any;

    await expect(
      findManagedUserCompany(repository, 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
