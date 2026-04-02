import type {
  ManagedContactDetail,
  ManagedContactListItem,
  UpdateManagedContactIgnoreUntilResponse,
} from '../../api/contacts.api';

export function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Ainda sem interação';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatPhone(value: string | null): string {
  return value?.trim() || 'Telefone indisponível';
}

export function buildContactLabel(contact: {
  id: string;
  name: string | null;
  phone: string | null;
}): string {
  return contact.name?.trim() || contact.phone?.trim() || `Contato ${contact.id}`;
}

export function buildContactInitials(contact: {
  name: string | null;
  phone: string | null;
}): string {
  const label = contact.name?.trim() || contact.phone?.trim() || '?';
  const words = label.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function findContactInList(
  contacts: ManagedContactListItem[],
  contactId: string | null,
): ManagedContactListItem | null {
  if (!contactId) {
    return null;
  }

  return contacts.find((contact) => contact.id === contactId) ?? null;
}

export function mergeDetailIntoListItem(
  contact: ManagedContactListItem,
  detail: ManagedContactDetail,
): ManagedContactListItem {
  return {
    ...contact,
    name: detail.name,
    phone: detail.phone,
    email: detail.email,
    instagram: detail.instagram,
    ignoreUntil: detail.ignoreUntil,
    isIgnored: detail.isIgnored,
    lastInteractionAt: detail.lastInteractionAt,
  };
}

export function applyIgnoreUpdateToDetail(
  currentDetail: ManagedContactDetail,
  response: UpdateManagedContactIgnoreUntilResponse,
): ManagedContactDetail {
  return {
    ...currentDetail,
    ...response.contact,
    lastInteractionAt:
      response.contact.lastInteractionAt ?? currentDetail.lastInteractionAt,
  };
}
