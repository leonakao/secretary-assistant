import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type {
  ManagedContactListItem,
  ManagedContactsPagination,
} from '../../../api/contacts.api';
import {
  buildContactInitials,
  buildContactLabel,
  formatDateTime,
  formatPhone,
} from '../contacts-page.utils';
import { ContactStatusBadge } from './contact-status-badge';

interface ContactsDirectoryProps {
  contacts: ManagedContactListItem[];
  currentPage: number;
  totalPages: number;
  pagination: ManagedContactsPagination | null;
  isListRefreshing: boolean;
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  onPageChange: (page: number) => void;
}

export function ContactsDirectory({
  contacts,
  currentPage,
  totalPages,
  pagination,
  isListRefreshing,
  selectedContactId,
  onSelectContact,
  onPageChange,
}: ContactsDirectoryProps) {
  return (
    <section>
      <div className="space-y-4 rounded-[1.75rem] border border-border/80 bg-card/80 p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Lista de contatos
            </p>
            <p className="text-sm text-muted-foreground">
              {pagination?.totalItems ?? contacts.length} contatos cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isListRefreshing ? (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                Atualizando lista...
              </span>
            ) : null}
          </div>
        </div>

        {contacts.length === 0 ? (
          <div
            className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-4 py-8 text-sm leading-7 text-muted-foreground"
            data-testid="contacts-empty-state"
          >
            Os contatos vão aparecer aqui assim que o assistente começar a
            receber mensagens.
          </div>
        ) : (
          <div
            className="overflow-hidden"
            data-testid="contacts-list"
          >
            <div className="hidden grid-cols-[minmax(0,1.2fr)_150px_120px] items-center gap-4 border-b border-border/80 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:grid">
              <span>Contato</span>
              <span>Última interação</span>
              <span className="text-right">Automação</span>
            </div>
            {contacts.map((contact) => {
              const isSelected = contact.id === selectedContactId;

              return (
                <button
                  key={contact.id}
                  className={cn(
                    'relative w-full cursor-pointer border-b border-border/70 px-2 py-4 text-left transition-colors last:border-b-0',
                    isSelected ? 'bg-brand/5' : 'bg-background/0 hover:bg-muted/40',
                  )}
                  data-testid={`contact-row-${contact.id}`}
                  onClick={() => onSelectContact(contact.id)}
                  type="button"
                >
                  {isSelected ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand" /> : null}
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1.2fr)_150px_120px] sm:items-center sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold',
                            isSelected
                              ? 'bg-brand text-brand-foreground'
                              : 'bg-muted text-foreground/80',
                          )}
                        >
                          {buildContactInitials(contact)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-brand" />
                            <p className="truncate text-sm font-semibold text-foreground">
                              {buildContactLabel(contact)}
                            </p>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {formatPhone(contact.phone)}
                          </p>
                          {contact.lastInteractionPreview ? (
                            <p
                              className={cn(
                                'text-sm leading-6 text-muted-foreground',
                                isSelected ? 'line-clamp-2' : 'line-clamp-1',
                              )}
                            >
                              {contact.lastInteractionPreview}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Sem prévia disponível da conversa recente.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
                        Última interação
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {contact.lastInteractionAt
                          ? formatDateTime(contact.lastInteractionAt)
                          : 'Sem atividade'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
                        Automação
                      </p>
                      <ContactStatusBadge isIgnored={contact.isIgnored} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {contacts.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {Math.max(totalPages, 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                className="w-full sm:w-auto"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                type="button"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                type="button"
                variant="outline"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
