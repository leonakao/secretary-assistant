import { CalendarClock, MessageCircleMore, Phone } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { cn } from '~/lib/utils';
import type {
  ManagedContactConversationMessage,
  ManagedContactDetail,
} from '../../../api/contacts.api';
import {
  buildContactInitials,
  buildContactLabel,
  formatDateTime,
  formatPhone,
  toDateTimeLocalValue,
} from '../contacts-page.utils';
import { ContactConversationTimeline } from './contact-conversation-timeline';
import { ContactStatusBadge } from './contact-status-badge';

interface ContactDetailPanelProps {
  detailContactLabel: string;
  selectedContactId: string | null;
  selectedContact: ManagedContactDetail | null;
  isDetailLoading: boolean;
  detailError: string | null;
  ignoreError: string | null;
  ignoreDraft: string;
  isUpdatingIgnoreUntil: boolean;
  conversationMessages: ManagedContactConversationMessage[];
  hasMoreMessages: boolean;
  onIgnoreDraftChange: (value: string) => void;
  onSubmitIgnoreUntil: () => void;
  onClearIgnoreUntil: () => void;
  className?: string;
}

export function ContactDetailPanel({
  detailContactLabel,
  selectedContactId,
  selectedContact,
  isDetailLoading,
  detailError,
  ignoreError,
  ignoreDraft,
  isUpdatingIgnoreUntil,
  conversationMessages,
  hasMoreMessages,
  onIgnoreDraftChange,
  onSubmitIgnoreUntil,
  onClearIgnoreUntil,
  className,
}: ContactDetailPanelProps) {
  const currentIgnoreUntilValue = selectedContact
    ? toDateTimeLocalValue(selectedContact.ignoreUntil)
    : '';
  const hasIgnoreDraftChanges = ignoreDraft !== currentIgnoreUntilValue;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded-[1.75rem] border border-brand/15 bg-card p-5 shadow-lg shadow-brand/5 sm:rounded-[2rem] sm:p-6',
        className,
      )}
    >
      <DrawerHeader className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Contato selecionado
            </p>
            <DrawerTitle data-testid="contact-detail-heading">
              {detailContactLabel}
            </DrawerTitle>
          </div>
          <DrawerClose aria-label="Fechar detalhe do contato" />
        </div>
      </DrawerHeader>

      <div className="pt-4">
        {!selectedContactId ? null : isDetailLoading ? (
          <div
            className="space-y-3 rounded-[1.5rem] border border-border bg-background/70 p-4"
            data-testid="contact-detail-loading"
          >
            <div className="h-8 rounded-full bg-muted" />
            <div className="h-20 rounded-[1.25rem] bg-muted" />
            <div className="h-28 rounded-[1.25rem] bg-muted" />
          </div>
        ) : detailError ? (
          <div
            className="rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-4 py-5 text-sm leading-6 text-destructive"
            data-testid="contact-detail-error"
          >
            {detailError}
          </div>
        ) : !selectedContact ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-4 py-8 text-sm leading-7 text-muted-foreground">
            Não foi possível localizar este contato.
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-4 rounded-[1.5rem] border border-brand/15 bg-brand/5 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-brand text-sm font-semibold text-brand-foreground">
                  {buildContactInitials(selectedContact)}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">
                      {buildContactLabel(selectedContact)}
                    </p>
                    <ContactStatusBadge isIgnored={selectedContact.isIgnored} />
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 text-brand" />
                    {formatPhone(selectedContact.phone)}
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 border-t border-brand/15 pt-4 sm:grid-cols-2 sm:gap-0">
                <div className="space-y-2 sm:pr-4">
                  <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Última interação
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formatDateTime(selectedContact.lastInteractionAt)}
                  </dd>
                </div>

                <div className="space-y-2 sm:border-l sm:border-brand/15 sm:pl-4">
                  <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Automação
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {selectedContact.ignoreUntil ? (
                      <span className="inline-flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>Pausada até {formatDateTime(selectedContact.ignoreUntil)}</span>
                      </span>
                    ) : (
                      'Respondendo normalmente'
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-4 rounded-[1.5rem] border border-border bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Histórico recente
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Últimas mensagens trocadas com esse contato.
                  </p>
                </div>
                <MessageCircleMore className="h-5 w-5 text-brand" />
              </div>

              <ContactConversationTimeline messages={conversationMessages} />

              {hasMoreMessages ? (
                <p className="text-xs text-muted-foreground">
                  Existem mensagens mais antigas fora desta prévia.
                </p>
              ) : null}
            </section>
          </div>
        )}
      </div>
      

      {selectedContact && !isDetailLoading && !detailError ? (
        <DrawerFooter className="mt-4">
          <section className="space-y-4 rounded-[1.5rem] border border-border bg-background/80 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Automação de respostas
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Defina se esse contato deve continuar recebendo respostas
                automáticas.
              </p>
            </div>

            {ignoreError ? (
              <div
                className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-testid="contact-ignore-error"
              >
                {ignoreError}
              </div>
            ) : null}

            <div className="space-y-3">
              <label
                className="block text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
                htmlFor="contact-ignore-until"
              >
                Pausar até
              </label>
              <input
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
                data-testid="contact-ignore-until-input"
                id="contact-ignore-until"
                onChange={(event) => onIgnoreDraftChange(event.target.value)}
                type="datetime-local"
                value={ignoreDraft}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {hasIgnoreDraftChanges ? (
                <Button
                  className="w-full sm:w-auto"
                  data-testid="contact-ignore-save-button"
                  disabled={isUpdatingIgnoreUntil}
                  onClick={onSubmitIgnoreUntil}
                  type="button"
                >
                  {isUpdatingIgnoreUntil ? 'Salvando...' : 'Salvar'}
                </Button>
              ) : null}
              {selectedContact.isIgnored ? (
                <Button
                  className="w-full sm:w-auto"
                  data-testid="contact-ignore-clear-button"
                  disabled={isUpdatingIgnoreUntil}
                  onClick={onClearIgnoreUntil}
                  type="button"
                  variant="outline"
                >
                  Retomar respostas
                </Button>
              ) : null}
            </div>
          </section>
        </DrawerFooter>
      ) : null}
    </div>
  );
}
