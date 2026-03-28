import type { OnboardingMessage } from '../../../api/onboarding.api';
import type { PendingTranscriptItem, TranscriptItem } from './onboarding-chat.types';

export function isPendingTranscriptItem(
  item: TranscriptItem,
): item is PendingTranscriptItem {
  return 'kind' in item;
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function mergeMessagesIdempotently(
  currentMessages: OnboardingMessage[],
  nextMessages: OnboardingMessage[],
): OnboardingMessage[] {
  const merged = [...currentMessages];
  const seenIds = new Set(currentMessages.map((message) => message.id));

  for (const message of nextMessages) {
    if (seenIds.has(message.id)) {
      continue;
    }

    merged.push(message);
    seenIds.add(message.id);
  }

  return merged.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}
