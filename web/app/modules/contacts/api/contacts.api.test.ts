import { describe, expect, it, vi } from 'vitest';
import type { BoundApiClient } from '~/lib/api-client-context';
import {
  getManagedContactDetail,
  getManagedContacts,
  updateManagedContactIgnoreUntil,
} from './contacts.api';

function createClient() {
  return {
    fetchApi: vi.fn(),
  } as unknown as BoundApiClient;
}

describe('contacts.api', () => {
  it('loads the managed contacts page', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ contacts: [], pagination: {} });

    await getManagedContacts({ page: 2, pageSize: 20 }, client);

    expect(client.fetchApi).toHaveBeenCalledWith('/contacts/me?page=2&pageSize=20');
  });

  it('loads the selected contact detail', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ contact: { id: 'contact-1' } });

    await getManagedContactDetail('contact-1', client);

    expect(client.fetchApi).toHaveBeenCalledWith('/contacts/me/contact-1');
  });

  it('updates the ignore-until value for a managed contact', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ contact: { id: 'contact-1' } });

    await updateManagedContactIgnoreUntil(
      'contact-1',
      {
        ignoreUntil: '2026-04-20T18:30:00.000Z',
      },
      client,
    );

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/contacts/me/contact-1/ignore-until',
      {
        method: 'PATCH',
        body: JSON.stringify({
          ignoreUntil: '2026-04-20T18:30:00.000Z',
        }),
      },
    );
  });
});
