import { fetchApi } from '~/lib/api.client';

export interface SessionUser {
  id: string;
  authProviderId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
    role: 'owner' | 'admin' | 'employee';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
}

export async function getCurrentUser(authToken: string): Promise<SessionUser> {
  return fetchApi<SessionUser>('/users/me', {
    authToken,
    skipCredentials: true,
  });
}
