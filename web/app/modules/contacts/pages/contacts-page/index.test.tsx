import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoundApiClient } from '~/lib/api-client-context';
import type {
  ManagedContactDetail,
  ManagedContactListItem,
  ManagedContactsPagination,
} from '../../api/contacts.api';

const {
  mockClient,
  getManagedContactsMock,
  getManagedContactDetailMock,
  updateManagedContactIgnoreUntilMock,
} = vi.hoisted(() => ({
  mockClient: {} as BoundApiClient,
  getManagedContactsMock: vi.fn(),
  getManagedContactDetailMock: vi.fn(),
  updateManagedContactIgnoreUntilMock: vi.fn(),
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as Parameters<typeof createElement>[2]),
}));

vi.mock('~/lib/api-client-context', () => ({
  useApiClient: () => mockClient,
}));

vi.mock('../../api/contacts.api', async () => {
  const actual = await vi.importActual<typeof import('../../api/contacts.api')>(
    '../../api/contacts.api',
  );

  return {
    ...actual,
    getManagedContacts: getManagedContactsMock,
    getManagedContactDetail: getManagedContactDetailMock,
    updateManagedContactIgnoreUntil: updateManagedContactIgnoreUntilMock,
  };
});

function makePagination(
  overrides: Partial<ManagedContactsPagination> = {},
): ManagedContactsPagination {
  return {
    page: 1,
    pageSize: 20,
    totalItems: 2,
    totalPages: 2,
    ...overrides,
  };
}

function makeContact(
  overrides: Partial<ManagedContactListItem> = {},
): ManagedContactListItem {
  return {
    id: 'contact-1',
    name: 'Ana Costa',
    phone: '+5511999999999',
    email: null,
    instagram: null,
    ignoreUntil: '2026-04-20T18:30:00.000Z',
    isIgnored: true,
    lastInteractionAt: '2026-04-01T10:00:00.000Z',
    lastInteractionPreview: 'Oi, quero saber o horário disponível.',
    ...overrides,
  };
}

function makeDetail(
  overrides: Partial<ManagedContactDetail> = {},
): ManagedContactDetail {
  return {
    id: 'contact-1',
    name: 'Ana Costa',
    phone: '+5511999999999',
    email: null,
    instagram: null,
    ignoreUntil: '2026-04-20T18:30:00.000Z',
    isIgnored: true,
    lastInteractionAt: '2026-04-01T10:00:00.000Z',
    preferredUserId: null,
    ...overrides,
  };
}

beforeEach(() => {
  getManagedContactsMock.mockReset();
  getManagedContactDetailMock.mockReset();
  updateManagedContactIgnoreUntilMock.mockReset();
});

describe('ContactsPage', () => {
  it('loads and renders the managed contacts list', async () => {
    const { ContactsPage } = await import('./index');
    getManagedContactsMock.mockResolvedValue({
      contacts: [makeContact(), makeContact({ id: 'contact-2', name: 'Bruno Lima' })],
      pagination: makePagination(),
    });
    getManagedContactDetailMock.mockResolvedValue({
      contact: makeDetail(),
      conversation: {
        messages: [
          {
            id: 'message-1',
            role: 'user',
            content: 'Oi, quero saber o horário disponível.',
            createdAt: '2026-04-01T10:00:00.000Z',
          },
        ],
        hasMore: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/app/contacts?contactId=contact-1']}>
        <ContactsPage initialContactId="contact-1" initialPage={1} initialPageSize={20} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('contacts-page-skeleton')).toBeInTheDocument();

    await screen.findByRole('heading', {
      level: 1,
      name: 'Administração de contatos',
    });

    expect(getManagedContactsMock).toHaveBeenCalledWith(
      { page: 1, pageSize: 20 },
      mockClient,
    );
    expect(getManagedContactDetailMock).toHaveBeenCalledWith('contact-1', mockClient);
    expect(screen.getByTestId('contact-row-contact-1')).toBeInTheDocument();
    expect(screen.getByText('Oi, quero saber o horário disponível.')).toBeInTheDocument();
  });

  it('updates the detail when another contact is selected', async () => {
    const { ContactsPage } = await import('./index');
    getManagedContactsMock.mockResolvedValue({
      contacts: [
        makeContact(),
        makeContact({
          id: 'contact-2',
          name: 'Bruno Lima',
          phone: '+5511888888888',
          ignoreUntil: null,
          isIgnored: false,
        }),
      ],
      pagination: makePagination(),
    });
    getManagedContactDetailMock.mockResolvedValueOnce({
      contact: makeDetail(),
      conversation: { messages: [], hasMore: false },
    });
    getManagedContactDetailMock.mockResolvedValueOnce({
      contact: makeDetail({
        id: 'contact-2',
        name: 'Bruno Lima',
        phone: '+5511888888888',
        ignoreUntil: null,
        isIgnored: false,
      }),
      conversation: {
        messages: [
          {
            id: 'message-2',
            role: 'assistant',
            content: 'Claro, posso te ajudar com isso.',
            createdAt: '2026-04-02T11:00:00.000Z',
          },
        ],
        hasMore: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/app/contacts?contactId=contact-1']}>
        <ContactsPage initialContactId="contact-1" initialPage={1} initialPageSize={20} />
      </MemoryRouter>,
    );

    await screen.findByTestId('contact-row-contact-2');
    fireEvent.click(screen.getByTestId('contact-row-contact-2'));

    await screen.findByRole('heading', { level: 2, name: 'Bruno Lima' });
    expect(getManagedContactDetailMock).toHaveBeenLastCalledWith(
      'contact-2',
      mockClient,
    );
    expect(screen.getByText('Claro, posso te ajudar com isso.')).toBeInTheDocument();
  });

  it('clears the ignore state from the detail pane', async () => {
    const { ContactsPage } = await import('./index');
    getManagedContactsMock.mockResolvedValue({
      contacts: [makeContact()],
      pagination: makePagination(),
    });
    getManagedContactDetailMock.mockResolvedValue({
      contact: makeDetail(),
      conversation: { messages: [], hasMore: false },
    });
    updateManagedContactIgnoreUntilMock.mockResolvedValue({
      contact: makeDetail({
        ignoreUntil: null,
        isIgnored: false,
      }),
      conversation: { messages: [], hasMore: false },
    });

    render(
      <MemoryRouter initialEntries={['/app/contacts?contactId=contact-1']}>
        <ContactsPage initialContactId="contact-1" initialPage={1} initialPageSize={20} />
      </MemoryRouter>,
    );

    await screen.findByTestId('contact-ignore-clear-button');
    fireEvent.click(screen.getByTestId('contact-ignore-clear-button'));

    await waitFor(() => {
      expect(updateManagedContactIgnoreUntilMock).toHaveBeenCalledWith(
        'contact-1',
        { ignoreUntil: null },
        mockClient,
      );
    });

    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('shows the local empty state when no contacts exist', async () => {
    const { ContactsPage } = await import('./index');
    getManagedContactsMock.mockResolvedValue({
      contacts: [],
      pagination: makePagination({ totalItems: 0, totalPages: 1 }),
    });

    render(
      <MemoryRouter initialEntries={['/app/contacts']}>
        <ContactsPage initialContactId={null} initialPage={1} initialPageSize={20} />
      </MemoryRouter>,
    );

    await screen.findByTestId('contacts-empty-state');
    expect(getManagedContactDetailMock).not.toHaveBeenCalled();
    expect(getManagedContactsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected detail stable while paginating to another slice', async () => {
    const { ContactsPage } = await import('./index');
    let resolveSecondPage!: (value: {
      contacts: ManagedContactListItem[];
      pagination: ManagedContactsPagination;
    }) => void;
    const secondPagePromise = new Promise<{
      contacts: ManagedContactListItem[];
      pagination: ManagedContactsPagination;
    }>((resolve) => {
      resolveSecondPage = resolve;
    });

    getManagedContactsMock
      .mockResolvedValueOnce({
        contacts: [makeContact()],
        pagination: makePagination({ page: 1, totalItems: 2, totalPages: 2 }),
      })
      .mockReturnValueOnce(secondPagePromise);
    getManagedContactDetailMock.mockResolvedValue({
      contact: makeDetail(),
      conversation: {
        messages: [
          {
            id: 'message-1',
            role: 'user',
            content: 'Quero confirmar meu agendamento.',
            createdAt: '2026-04-01T10:00:00.000Z',
          },
        ],
        hasMore: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/app/contacts?page=1&pageSize=20&contactId=contact-1']}>
        <ContactsPage initialContactId="contact-1" initialPage={1} initialPageSize={20} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 2, name: 'Ana Costa' });

    fireEvent.click(screen.getByText('Próxima'));

    await waitFor(() => {
      expect(getManagedContactsMock).toHaveBeenLastCalledWith(
        { page: 2, pageSize: 20 },
        mockClient,
      );
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Ana Costa' })).toBeInTheDocument();
    expect(screen.getByText('Quero confirmar meu agendamento.')).toBeInTheDocument();
    expect(screen.getByText('Atualizando lista...')).toBeInTheDocument();
    expect(screen.queryByTestId('contacts-page-skeleton')).not.toBeInTheDocument();

    resolveSecondPage({
      contacts: [
        makeContact({
          id: 'contact-2',
          name: 'Bruno Lima',
          phone: '+5511888888888',
          ignoreUntil: null,
          isIgnored: false,
        }),
      ],
      pagination: makePagination({ page: 2, totalItems: 2, totalPages: 2 }),
    });

    await waitFor(() => {
      expect(screen.queryByText('Atualizando lista...')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Ana Costa' })).toBeInTheDocument();
    expect(screen.getByText('Quero confirmar meu agendamento.')).toBeInTheDocument();
  });
});
