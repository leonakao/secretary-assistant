import { describe, expect, it, vi } from 'vitest';
import {
  initializeOnboardingConversation,
  sendOnboardingAudioMessage,
  sendOnboardingMessage,
  type OnboardingStateResponse,
} from './onboarding.api';
import type { BoundApiClient } from '~/lib/api-client-context';

function makeClient() {
  return {
    fetchApi: vi.fn(),
    fetchApiResponse: vi.fn(),
  } satisfies BoundApiClient;
}

describe('onboarding api', () => {
  it('posts text messages as JSON', async () => {
    const client = makeClient();

    client.fetchApi.mockResolvedValue({
      company: null,
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
      userMessage: {
        id: 'user-1',
        role: 'user',
        content: 'Hello',
        createdAt: '2026-03-27T10:00:00.000Z',
      },
      assistantMessage: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hi there',
        createdAt: '2026-03-27T10:00:01.000Z',
      },
    });

    await sendOnboardingMessage({ message: 'Hello' }, client);

    expect(client.fetchApi).toHaveBeenCalledWith('/onboarding/messages', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });
  });

  it('posts conversation initialization with an explicit endpoint', async () => {
    const client = makeClient();

    client.fetchApi.mockResolvedValue({
      company: null,
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
      initialized: true,
      assistantMessage: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Welcome',
        createdAt: '2026-03-27T10:00:00.000Z',
      },
    });

    await initializeOnboardingConversation(client);

    expect(client.fetchApi).toHaveBeenCalledWith('/onboarding/messages/initialize', {
      method: 'POST',
    });
  });

  it('posts audio messages as multipart form data', async () => {
    const client = makeClient();

    client.fetchApi.mockResolvedValue({
      company: null,
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
      userMessage: {
        id: 'user-1',
        role: 'user',
        content: 'We fix leaks',
        createdAt: '2026-03-27T10:00:00.000Z',
      },
      assistantMessage: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Understood',
        createdAt: '2026-03-27T10:00:01.000Z',
      },
    });

    const audio = new Blob(['audio'], { type: 'audio/webm' });

    await sendOnboardingAudioMessage(
      { audio, durationMs: 2400, mimeType: 'audio/webm' },
      client,
    );

    const [, options] = client.fetchApi.mock.calls[0];
    const body = options.body as FormData;

    expect(client.fetchApi).toHaveBeenCalledWith(
      '/onboarding/messages',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(body.get('kind')).toBe('audio');
    const audioField = body.get('audio');
    expect(audioField).toBeInstanceOf(File);
    expect((audioField as File).type).toBe('audio/webm');
    expect(body.get('durationMs')).toBe('2400');
    expect(body.get('mimeType')).toBe('audio/webm');
  });

  it('includes initialization state in the onboarding state contract', () => {
    const response: OnboardingStateResponse = {
      company: null,
      onboarding: { requiresOnboarding: true, step: 'assistant-chat' },
      conversation: {
        threadId: 'onboarding:company-1:user-1',
        isInitialized: false,
        messages: [],
      },
    };

    expect(response.conversation?.isInitialized).toBe(false);
  });
});
