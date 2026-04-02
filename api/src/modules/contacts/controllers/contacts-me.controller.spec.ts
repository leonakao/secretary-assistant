import { describe, expect, it, vi } from 'vitest';
import { ContactsMeController } from './contacts-me.controller';

function makeUser() {
  return { id: 'user-1' } as any;
}

describe('ContactsMeController', () => {
  it('routes paginated list requests to the list use case', async () => {
    const listManagedContacts = { execute: vi.fn().mockResolvedValue({}) };
    const controller = new ContactsMeController(
      listManagedContacts as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    const query = { page: 2, pageSize: 10 };
    await controller.listContacts(makeUser(), query);

    expect(listManagedContacts.execute).toHaveBeenCalledWith(makeUser(), query);
  });

  it('routes detail requests to the detail use case', async () => {
    const getManagedContactDetail = { execute: vi.fn().mockResolvedValue({}) };
    const controller = new ContactsMeController(
      { execute: vi.fn() } as any,
      getManagedContactDetail as any,
      { execute: vi.fn() } as any,
    );

    await controller.getContactDetail(makeUser(), 'contact-1');

    expect(getManagedContactDetail.execute).toHaveBeenCalledWith(
      makeUser(),
      'contact-1',
    );
  });

  it('routes ignore updates to the dedicated use case', async () => {
    const updateManagedContactIgnoreUntil = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new ContactsMeController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      updateManagedContactIgnoreUntil as any,
    );

    const dto = { ignoreUntil: '2026-05-01T12:00:00.000Z' };
    await controller.updateIgnoreUntil(makeUser(), 'contact-1', dto);

    expect(updateManagedContactIgnoreUntil.execute).toHaveBeenCalledWith(
      makeUser(),
      'contact-1',
      dto,
    );
  });
});
