import type { BoundApiClient } from '~/lib/api-client-context';

export interface ManagedCompany {
  id: string;
  name: string;
  businessType: string | null;
  description: string | null;
  step: 'onboarding' | 'running';
  updatedAt: string;
}

interface ManagedCompanyResponse {
  company: ManagedCompany;
}

export interface UpdateManagedCompanyProfileInput {
  name: string;
  businessType: string | null;
}

export interface UpdateManagedCompanyKnowledgeBaseInput {
  markdown: string;
}

export async function getManagedCompany(
  client: BoundApiClient,
): Promise<ManagedCompanyResponse> {
  return client.fetchApi<ManagedCompanyResponse>('/companies/me');
}

export async function updateManagedCompanyProfile(
  input: UpdateManagedCompanyProfileInput,
  client: BoundApiClient,
): Promise<ManagedCompanyResponse> {
  return client.fetchApi<ManagedCompanyResponse>('/companies/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateManagedCompanyKnowledgeBase(
  input: UpdateManagedCompanyKnowledgeBaseInput,
  client: BoundApiClient,
): Promise<ManagedCompanyResponse> {
  return client.fetchApi<ManagedCompanyResponse>('/companies/me/knowledge-base', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
