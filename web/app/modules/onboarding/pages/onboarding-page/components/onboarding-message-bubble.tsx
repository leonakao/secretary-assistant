import { Bot } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { OnboardingMessage } from '../../../api/onboarding.api';

interface OnboardingMessageBubbleProps {
  message: OnboardingMessage;
}

export function OnboardingMessageBubble({
  message,
}: OnboardingMessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-2.5',
        message.role === 'user' ? 'justify-end' : 'justify-start',
      )}
      data-testid="onboarding-message-row"
      data-message-id={message.id}
      data-message-role={message.role}
    >
      {message.role === 'assistant' ? (
        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Bot className="h-3.5 w-3.5 text-brand" />
        </div>
      ) : null}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap',
          message.role === 'user'
            ? 'rounded-br-sm bg-brand text-white'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
        data-testid="onboarding-message-content"
      >
        {message.content}
      </div>
    </div>
  );
}
