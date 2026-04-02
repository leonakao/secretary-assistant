import { describe, expect, it } from 'vitest';
import { resolveInterviewProgress, resolveTurnDelayMs } from './interview-driver';

describe('resolveTurnDelayMs', () => {
  it('uses the default delay when the env value is missing or invalid', () => {
    expect(resolveTurnDelayMs(undefined)).toBe(0);
    expect(resolveTurnDelayMs('not-a-number')).toBe(0);
    expect(resolveTurnDelayMs('-1')).toBe(0);
  });

  it('uses the configured delay when the env value is valid', () => {
    expect(resolveTurnDelayMs('22000')).toBe(22000);
  });
});

describe('resolveInterviewProgress', () => {
  it('prioritizes workspace navigation when the app route is already active', () => {
    expect(
      resolveInterviewProgress({
        hasCompletionCta: true,
        latestAssistantId: 'assistant-2',
        pathname: '/app',
        previousAssistantId: 'assistant-1',
      }),
    ).toBe('workspace');
  });

  it('detects onboarding completion before waiting for another assistant reply', () => {
    expect(
      resolveInterviewProgress({
        hasCompletionCta: true,
        latestAssistantId: 'assistant-1',
        pathname: '/onboarding',
        previousAssistantId: 'assistant-1',
      }),
    ).toBe('completion');
  });

  it('detects a new assistant reply when completion was not reached', () => {
    expect(
      resolveInterviewProgress({
        hasCompletionCta: false,
        latestAssistantId: 'assistant-2',
        pathname: '/onboarding',
        previousAssistantId: 'assistant-1',
      }),
    ).toBe('reply');
  });

  it('returns null while the interview is still waiting on the current turn', () => {
    expect(
      resolveInterviewProgress({
        hasCompletionCta: false,
        latestAssistantId: 'assistant-1',
        pathname: '/onboarding',
        previousAssistantId: 'assistant-1',
      }),
    ).toBeNull();
  });
});
