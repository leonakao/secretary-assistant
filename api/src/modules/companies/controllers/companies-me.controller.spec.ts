import { describe, expect, it, vi } from 'vitest';
import { CompaniesMeController } from './companies-me.controller';

function makeUser() {
  return { id: 'user-1' } as any;
}

describe('CompaniesMeController', () => {
  it('reads the managed company', async () => {
    const getManagedCompany = { execute: vi.fn().mockResolvedValue({}) };
    const controller = new CompaniesMeController(
      getManagedCompany as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.getCompany(makeUser());

    expect(getManagedCompany.execute).toHaveBeenCalledWith(makeUser());
  });

  it('routes profile updates to the dedicated use case', async () => {
    const updateManagedCompanyProfile = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeController(
      { execute: vi.fn() } as any,
      updateManagedCompanyProfile as any,
      { execute: vi.fn() } as any,
    );

    await controller.updateProfile(makeUser(), {
      name: 'Acme',
      businessType: 'Dental Clinic',
    });

    expect(updateManagedCompanyProfile.execute).toHaveBeenCalledWith(
      makeUser(),
      { name: 'Acme', businessType: 'Dental Clinic' },
    );
  });

  it('routes knowledge-base updates to the dedicated use case', async () => {
    const updateManagedCompanyKnowledgeBase = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      updateManagedCompanyKnowledgeBase as any,
    );

    await controller.updateKnowledgeBase(makeUser(), {
      markdown: '# Updated knowledge',
    });

    expect(updateManagedCompanyKnowledgeBase.execute).toHaveBeenCalledWith(
      makeUser(),
      { markdown: '# Updated knowledge' },
    );
  });
});
