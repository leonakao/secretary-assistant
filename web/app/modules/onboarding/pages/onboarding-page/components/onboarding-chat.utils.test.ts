import { describe, expect, it } from 'vitest';
import { formatDuration, mergeMessagesIdempotently } from './onboarding-chat.utils';

describe('onboarding-chat.utils', () => {
  it('formats durations with a minimum of one second', () => {
    expect(formatDuration(0)).toBe('0:01');
    expect(formatDuration(61_000)).toBe('1:01');
  });

  it('merges messages idempotently and preserves chronological order', () => {
    const currentMessages = [
      {
        id: 'assistant-2',
        role: 'assistant' as const,
        content: 'Second',
        createdAt: '2026-03-27T12:00:02.000Z',
      },
      {
        id: 'assistant-1',
        role: 'assistant' as const,
        content: 'First',
        createdAt: '2026-03-27T12:00:01.000Z',
      },
    ];

    const merged = mergeMessagesIdempotently(currentMessages, [
      currentMessages[0],
      {
        id: 'user-1',
        role: 'user' as const,
        content: 'Third',
        createdAt: '2026-03-27T12:00:03.000Z',
      },
    ]);

    expect(merged.map((message) => message.id)).toEqual([
      'assistant-1',
      'assistant-2',
      'user-1',
    ]);
  });
});
