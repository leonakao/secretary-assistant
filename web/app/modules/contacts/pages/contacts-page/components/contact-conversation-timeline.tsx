import { cn } from '~/lib/utils';
import type { ManagedContactConversationMessage } from '../../../api/contacts.api';
import { formatDateTime } from '../contacts-page.utils';

interface ContactConversationTimelineProps {
  messages: ManagedContactConversationMessage[];
}

export function ContactConversationTimeline({
  messages,
}: ContactConversationTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-4 py-6 text-sm leading-6 text-muted-foreground">
        Ainda não existe histórico recente de conversa para este contato.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="contact-conversation-timeline">
      {messages.map((message) => {
        const isUserMessage = message.role === 'user';
        const senderLabel =
          message.role === 'assistant'
            ? 'Assistente'
            : isUserMessage
              ? 'Contato'
              : 'Sistema';

        return (
          <article
            key={message.id}
            className={cn(
              'rounded-[1.5rem] border px-4 py-3 shadow-sm',
              isUserMessage
                ? 'border-border bg-background/80'
                : 'border-brand/15 bg-brand/5',
            )}
          >
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
              <span>{senderLabel}</span>
              <span>{formatDateTime(message.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {message.content}
            </p>
          </article>
        );
      })}
    </div>
  );
}
