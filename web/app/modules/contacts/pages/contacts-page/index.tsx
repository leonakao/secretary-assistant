import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Drawer, DrawerBody, DrawerContent } from '~/components/ui/drawer';
import { useApiClient } from '~/lib/api-client-context';
import {
  getManagedContactDetail,
  getManagedContacts,
  updateManagedContactIgnoreUntil,
  type ManagedContactDetail,
  type ManagedContactDetailResponse,
  type ManagedContactListItem,
  type ManagedContactsPagination,
} from '../../api/contacts.api';
import {
  applyIgnoreUpdateToDetail,
  buildContactLabel,
  findContactInList,
  mergeDetailIntoListItem,
  toDateTimeLocalValue,
} from './contacts-page.utils';
import { ContactDetailPanel } from './components/contact-detail-panel';
import { ContactsDirectory } from './components/contacts-directory';
import { ContactsPageSkeleton } from './components/contacts-page-skeleton';

interface ContactsPageProps {
  initialContactId: string | null;
  initialPage: number;
  initialPageSize: number;
}

export function ContactsPage({
  initialContactId,
  initialPage,
  initialPageSize,
}: ContactsPageProps) {
  const client = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasLoadedListOnceRef = useRef(false);

  const page = Number.parseInt(searchParams.get('page') ?? '', 10) || initialPage;
  const pageSize =
    Number.parseInt(searchParams.get('pageSize') ?? '', 10) || initialPageSize;
  const selectedContactId = searchParams.get('contactId') ?? initialContactId;

  const [contacts, setContacts] = useState<ManagedContactListItem[]>([]);
  const [pagination, setPagination] = useState<ManagedContactsPagination | null>(
    null,
  );
  const [listError, setListError] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [hasLoadedListOnce, setHasLoadedListOnce] = useState(false);
  const [isListRefreshing, setIsListRefreshing] = useState(false);

  const [selectedContact, setSelectedContact] = useState<ManagedContactDetail | null>(
    null,
  );
  const [conversationMessages, setConversationMessages] = useState<
    ManagedContactDetailResponse['conversation']['messages']
  >([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [ignoreDraft, setIgnoreDraft] = useState('');
  const [ignoreError, setIgnoreError] = useState<string | null>(null);
  const [isUpdatingIgnoreUntil, setIsUpdatingIgnoreUntil] = useState(false);

  const selectedContactListItem = useMemo(
    () => findContactInList(contacts, selectedContactId),
    [contacts, selectedContactId],
  );

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    setSearchParams(next);
  };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (!searchParams.get('page')) {
      next.set('page', String(initialPage));
      changed = true;
    }

    if (!searchParams.get('pageSize')) {
      next.set('pageSize', String(initialPageSize));
      changed = true;
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [initialPage, initialPageSize, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    if (hasLoadedListOnceRef.current) {
      setIsListRefreshing(true);
    } else {
      setIsListLoading(true);
    }

    void getManagedContacts({ page, pageSize }, client)
      .then(
        (response) => {
          if (cancelled) {
            return;
          }

          setContacts(response.contacts);
          setPagination(response.pagination);
          setListError(null);
          setHasLoadedListOnce(true);
          hasLoadedListOnceRef.current = true;
        },
        (cause: unknown) => {
          if (cancelled) {
            return;
          }

          setListError(
            cause instanceof Error
              ? cause.message
              : 'Não foi possível carregar os contatos.',
          );
        },
      )
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsListLoading(false);
        setIsListRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, page, pageSize]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedContactId) {
      setSelectedContact(null);
      setConversationMessages([]);
      setHasMoreMessages(false);
      setDetailError(null);
      setIgnoreDraft('');
      return;
    }

    setIsDetailLoading(true);

    void getManagedContactDetail(selectedContactId, client)
      .then(
        (response: ManagedContactDetailResponse) => {
          if (cancelled) {
            return;
          }

          setSelectedContact(response.contact);
          setConversationMessages(response.conversation.messages);
          setHasMoreMessages(response.conversation.hasMore);
          setIgnoreDraft(toDateTimeLocalValue(response.contact.ignoreUntil));
          setIgnoreError(null);
          setDetailError(null);
        },
        (cause: unknown) => {
          if (cancelled) {
            return;
          }

          setDetailError(
            cause instanceof Error
              ? cause.message
              : 'Não foi possível carregar o detalhe do contato.',
          );
        },
      )
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, selectedContactId]);

  const handleSelectContact = (contactId: string) => {
    updateQueryParams({ contactId });
  };

  const handleCloseContactDetail = () => {
    updateQueryParams({ contactId: null });
  };

  const handlePageChange = (nextPage: number) => {
    updateQueryParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
  };

  const handleClearIgnoreUntil = async () => {
    if (!selectedContact) {
      return;
    }

    try {
      setIsUpdatingIgnoreUntil(true);
      const response = await updateManagedContactIgnoreUntil(
        selectedContact.id,
        { ignoreUntil: null },
        client,
      );

      setSelectedContact((currentDetail) =>
        currentDetail ? applyIgnoreUpdateToDetail(currentDetail, response) : currentDetail,
      );
      setIgnoreDraft(toDateTimeLocalValue(response.contact.ignoreUntil));
      setIgnoreError(null);
      setContacts((currentContacts) =>
        currentContacts.map((contact) =>
          contact.id === response.contact.id
            ? mergeDetailIntoListItem(contact, response.contact)
            : contact,
        ),
      );
    } catch (cause: unknown) {
      setIgnoreError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível remover o período de ignorar.',
      );
    } finally {
      setIsUpdatingIgnoreUntil(false);
    }
  };

  const handleSubmitIgnoreUntil = async () => {
    if (!selectedContact) {
      return;
    }

    if (!ignoreDraft) {
      setIgnoreError('Escolha uma data futura para pausar as respostas.');
      return;
    }

    const nextIgnoreUntil = new Date(ignoreDraft);

    if (Number.isNaN(nextIgnoreUntil.getTime()) || nextIgnoreUntil <= new Date()) {
      setIgnoreError('Escolha uma data futura válida.');
      return;
    }

    try {
      setIsUpdatingIgnoreUntil(true);
      const response = await updateManagedContactIgnoreUntil(
        selectedContact.id,
        { ignoreUntil: nextIgnoreUntil.toISOString() },
        client,
      );

      setSelectedContact((currentDetail) =>
        currentDetail ? applyIgnoreUpdateToDetail(currentDetail, response) : currentDetail,
      );
      setIgnoreDraft(toDateTimeLocalValue(response.contact.ignoreUntil));
      setIgnoreError(null);
      setContacts((currentContacts) =>
        currentContacts.map((contact) =>
          contact.id === response.contact.id
            ? mergeDetailIntoListItem(contact, response.contact)
            : contact,
        ),
      );
    } catch (cause: unknown) {
      setIgnoreError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível atualizar o período de ignorar.',
      );
    } finally {
      setIsUpdatingIgnoreUntil(false);
    }
  };

  if (isListLoading && !hasLoadedListOnce) {
    return <ContactsPageSkeleton />;
  }

  if (listError) {
    return (
      <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-12" data-testid="contacts-page">
        <section className="space-y-4 rounded-[1.75rem] border border-destructive/20 bg-card p-5 shadow-sm sm:rounded-[2rem] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">
            Contatos
          </p>
          <h1 className="text-[1.8rem] font-semibold tracking-tight text-foreground sm:text-[2.2rem]">
            Não foi possível carregar os contatos
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            {listError}
          </p>
        </section>
      </div>
    );
  }

  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? 1;
  const detailContactLabel = selectedContact
    ? buildContactLabel(selectedContact)
    : selectedContactListItem
      ? buildContactLabel(selectedContactListItem)
      : 'Selecione um contato';

  return (
    <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-12" data-testid="contacts-page">
      <ContactsDirectory
        contacts={contacts}
        currentPage={currentPage}
        isListRefreshing={isListRefreshing}
        onPageChange={handlePageChange}
        onSelectContact={handleSelectContact}
        pagination={pagination}
        selectedContactId={selectedContactId}
        totalPages={totalPages}
      />

      <Drawer
        modal
        onOpenChange={(open) => {
          if (!open) {
            handleCloseContactDetail();
          }
        }}
        open={Boolean(selectedContactId)}
      >
        <DrawerContent className="p-4" desktopSide="right" side="bottom">
          <DrawerBody>
            <ContactDetailPanel
              className="border-none bg-transparent p-0 shadow-none"
              conversationMessages={conversationMessages}
              detailContactLabel={detailContactLabel}
              detailError={detailError}
              hasMoreMessages={hasMoreMessages}
              ignoreDraft={ignoreDraft}
              ignoreError={ignoreError}
              isDetailLoading={isDetailLoading}
              isUpdatingIgnoreUntil={isUpdatingIgnoreUntil}
              onClearIgnoreUntil={handleClearIgnoreUntil}
              onIgnoreDraftChange={setIgnoreDraft}
              onSubmitIgnoreUntil={handleSubmitIgnoreUntil}
              selectedContact={selectedContact}
              selectedContactId={selectedContactId}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
