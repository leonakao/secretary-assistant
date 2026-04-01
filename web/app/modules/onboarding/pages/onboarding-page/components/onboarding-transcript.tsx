import { Bot, LoaderCircle } from 'lucide-react';
import type { RefObject } from 'react';
import { isPendingTranscriptItem } from './onboarding-chat.utils';
import type { TranscriptItem } from './onboarding-chat.types';
import { OnboardingMessageBubble } from './onboarding-message-bubble';

interface OnboardingTranscriptProps {
  items: TranscriptItem[];
  bottomRef: RefObject<HTMLDivElement | null>;
}

export function OnboardingTranscript({
  items,
  bottomRef,
}: OnboardingTranscriptProps) {
  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-6"
      data-testid="onboarding-transcript"
    >
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <div className="space-y-4">
          {items.map((item) => {
            if (isPendingTranscriptItem(item)) {
              if (
                item.kind === 'assistant-initializing' ||
                item.kind === 'assistant-typing'
              ) {
                return (
                  <div
                    key={item.id}
                    className="flex items-end gap-2.5 justify-start"
                    data-testid={
                      item.kind === 'assistant-initializing'
                        ? 'assistant-init-skeleton'
                        : 'assistant-typing-placeholder'
                    }
                  >
                    <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
                      <Bot className="h-3.5 w-3.5 text-brand" />
                    </div>
                    <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        {item.kind === 'assistant-initializing'
                          ? 'Assistente se preparando...'
                          : 'Assistente digitando...'}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="flex items-end gap-2.5 justify-end"
                  data-testid="audio-transcribing-placeholder"
                >
                  <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Transcrevendo áudio...
                    </span>
                  </div>
                </div>
              );
            }

            return <OnboardingMessageBubble key={item.id} message={item} />;
          })}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
