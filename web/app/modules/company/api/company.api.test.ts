import { describe, expect, it, vi } from 'vitest';
import type { BoundApiClient } from '~/lib/api-client-context';
import {
  getManagedCompany,
  updateManagedCompanyKnowledgeBase,
  updateManagedCompanyProfile,
} from './company.api';

function createClient() {
  return {
    fetchApi: vi.fn(),
  } as unknown as BoundApiClient;
}

describe('company.api', () => {
  it('loads the managed company', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ company: { id: 'company-1' } });

    await getManagedCompany(client);

    expect(client.fetchApi).toHaveBeenCalledWith('/companies/me');
  });

  it('updates the managed company profile', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ company: { id: 'company-1' } });

    await updateManagedCompanyProfile(
      {
        name: 'Acme',
        businessType: 'Clínica odontológica',
      },
      client,
    );

    expect(client.fetchApi).toHaveBeenCalledWith('/companies/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Acme',
        businessType: 'Clínica odontológica',
      }),
    });
  });

  it('updates the knowledge base markdown separately', async () => {
    const client = createClient();
    vi.mocked(client.fetchApi).mockResolvedValue({ company: { id: 'company-1' } });

    await updateManagedCompanyKnowledgeBase(
      {
        markdown: '# Acme',
      },
      client,
    );

    expect(client.fetchApi).toHaveBeenCalledWith('/companies/me/knowledge-base', {
      method: 'PUT',
      body: JSON.stringify({ markdown: '# Acme' }),
    });
  });
});
