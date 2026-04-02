export interface ManagedContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: Date | null;
  isIgnored: boolean;
  lastInteractionAt: Date | null;
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
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ManagedContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: Date | null;
  isIgnored: boolean;
  lastInteractionAt: Date | null;
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
