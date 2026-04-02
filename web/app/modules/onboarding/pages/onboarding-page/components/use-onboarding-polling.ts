import { useEffect } from 'react';
import type { BoundApiClient } from '~/lib/api-client-context';
import { getOnboardingMessages } from '../../../api/onboarding.api';
import type { OnboardingConversation } from '../../../api/onboarding.api';

interface UseOnboardingPollingOptions {
  enabled: boolean;
  client: BoundApiClient;
  expectedAssistantCount: number;
  pendingUserMessageId: string | null;
  intervalMs?: number;
  timeoutMs?: number;
  onPoll: (conversation: OnboardingConversation) => void;
  onSuccess: (conversation: OnboardingConversation) => void;
  onTimeout: () => void;
}

export function useOnboardingPolling(opts: UseOnboardingPollingOptions): void {
  const {
    enabled,
    client,
    expectedAssistantCount,
    pendingUserMessageId,
    intervalMs = 2000,
    timeoutMs = 30000,
    onPoll,
    onSuccess,
    onTimeout,
  } = opts;

  useEffect(() => {
    if (!enabled) return;

    let pollTimeoutId: ReturnType<typeof setTimeout>;
    const startTime = Date.now();
    let isMounted = true;

    const poll = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeoutMs) {
        if (isMounted) {
          onTimeout();
        }
        return;
      }

      getOnboardingMessages(client)
        .then((conversation) => {
          if (!isMounted) return;

          if (conversation) {
            onPoll(conversation);

            if (conversation.onboarding.step === 'complete') {
              onSuccess(conversation);
              return;
            }

            if (
              conversation.isTyping ||
              (pendingUserMessageId !== null &&
                !conversation.messages.some(
                  (message) => message.id === pendingUserMessageId,
                ))
            ) {
              pollTimeoutId = setTimeout(poll, intervalMs);
              return;
            }

            const assistantMessageCount = conversation.messages.filter(
              (message) => message.role === 'assistant',
            ).length;

            if (assistantMessageCount > expectedAssistantCount) {
              onSuccess(conversation);
              return;
            }
          }

          pollTimeoutId = setTimeout(poll, intervalMs);
        })
        .catch(() => {
          if (!isMounted) return;

          const elapsed = Date.now() - startTime;
          if (elapsed >= timeoutMs) {
            onTimeout();
          } else {
            pollTimeoutId = setTimeout(poll, intervalMs);
          }
        });
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(pollTimeoutId);
    };
  }, [
    enabled,
    client,
    expectedAssistantCount,
    pendingUserMessageId,
    intervalMs,
    timeoutMs,
    onPoll,
    onSuccess,
    onTimeout,
  ]);
}
