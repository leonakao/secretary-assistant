import type { BoundApiClient } from '~/lib/api-client-context';

export interface ManagedContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: string | null;
  isIgnored: boolean;
  lastInteractionAt: string | null;
  lastInteractionPreview: string | null;
}

export interface ManagedContactsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ManagedContactsListResponse {
  contacts: ManagedContactListItem[];
  pagination: ManagedContactsPagination;
}

export interface ManagedContactConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ManagedContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: string | null;
  isIgnored: boolean;
  lastInteractionAt: string | null;
  preferredUserId: string | null;
}

export interface ManagedContactDetailResponse {
  contact: ManagedContactDetail;
  conversation: {
    messages: ManagedContactConversationMessage[];
    hasMore: boolean;
  };
}

export interface UpdateManagedContactIgnoreUntilResponse {
  contact: ManagedContactDetail;
}

export interface GetManagedContactsInput {
  page: number;
  pageSize: number;
}

export interface UpdateManagedContactIgnoreUntilInput {
  ignoreUntil: string | null;
}

function buildContactsQueryString(input: GetManagedContactsInput): string {
  const searchParams = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });

  return searchParams.toString();
}

export async function getManagedContacts(
  input: GetManagedContactsInput,
  client: BoundApiClient,
): Promise<ManagedContactsListResponse> {
  return client.fetchApi<ManagedContactsListResponse>(
    `/contacts/me?${buildContactsQueryString(input)}`,
  );
}

export async function getManagedContactDetail(
  contactId: string,
  client: BoundApiClient,
): Promise<ManagedContactDetailResponse> {
  return client.fetchApi<ManagedContactDetailResponse>(`/contacts/me/${contactId}`);
}

export async function updateManagedContactIgnoreUntil(
  contactId: string,
  input: UpdateManagedContactIgnoreUntilInput,
  client: BoundApiClient,
): Promise<UpdateManagedContactIgnoreUntilResponse> {
  return client.fetchApi<UpdateManagedContactIgnoreUntilResponse>(
    `/contacts/me/${contactId}/ignore-until`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}
