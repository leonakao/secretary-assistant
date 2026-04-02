import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InitializeOnboardingConversationResponse,
  OnboardingConversation,
  SendOnboardingMessageResponse,
} from '../../../api/onboarding.api';
import { OnboardingChat } from './onboarding-chat';
import { useOnboardingPolling } from './use-onboarding-polling';
import type { BoundApiClient } from '~/lib/api-client-context';

const {
  mockClient,
  getMessagesMock,
  initializeMock,
  sendTextMock,
  sendAudioMock,
  getUserMediaMock,
} = vi.hoisted(() => ({
  mockClient: {} as BoundApiClient,
  getMessagesMock: vi.fn<
    (client: BoundApiClient) => Promise<OnboardingConversation | null>
  >(),
  initializeMock: vi.fn<
    (client: BoundApiClient) => Promise<InitializeOnboardingConversationResponse>
  >(),
  sendTextMock: vi.fn<
    (input: { message: string }, client: BoundApiClient) => Promise<SendOnboardingMessageResponse>
  >(),
  sendAudioMock: vi.fn(),
  getUserMediaMock: vi.fn(),
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as Parameters<typeof createElement>[2]),
}));

vi.mock('~/lib/api-client-context', () => ({
  useApiClient: () => mockClient,
}));

vi.mock('../../../api/onboarding.api', async () => {
  const actual = await vi.importActual<typeof import('../../../api/onboarding.api')>(
    '../../../api/onboarding.api',
  );

  return {
    ...actual,
    getOnboardingMessages: getMessagesMock,
    initializeOnboardingConversation: initializeMock,
    sendOnboardingTextMessage: sendTextMock,
    sendOnboardingMessage: sendTextMock,
    sendOnboardingAudioMessage: sendAudioMock,
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function makeConversation(
  overrides: Partial<OnboardingConversation> = {},
): OnboardingConversation {
  return {
    threadId: 'onboarding:thread-1',
    isInitialized: true,
    messages: [],
    onboarding: {
      requiresOnboarding: true,
      step: 'assistant-chat',
    },
    isTyping: false,
    ...overrides,
  };
}

function makeSendResponse(
  overrides: Partial<SendOnboardingMessageResponse> = {},
): SendOnboardingMessageResponse {
  return {
    status: 'pending',
    userMessageId: 'user-1',
    ...overrides,
  };
}

class MockMediaRecorder {
  public mimeType = 'audio/webm';

  addEventListener(
    event: string,
    callback: (event?: Event | { data: Blob }) => void,
    options?: { once?: boolean },
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const wrappedCallback = options?.once
      ? (payload?: Event | { data: Blob }) => {
          callback(payload);
          this.listeners.set(
            event,
            (this.listeners.get(event) ?? []).filter((item) => item !== wrappedCallback),
          );
        }
      : callback;

    this.listeners.set(event, [...(this.listeners.get(event) ?? []), wrappedCallback]);
  }

  start() {}

  stop() {
    const blob = new Blob(['audio'], { type: this.mimeType });
    for (const callback of this.listeners.get('dataavailable') ?? []) {
      callback({ data: blob });
    }
    for (const callback of this.listeners.get('stop') ?? []) {
      callback(new Event('stop'));
    }
  }

  private readonly listeners = new Map<
    string,
    Array<(event?: Event | { data: Blob }) => void>
  >();
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:preview'),
  });

  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: getUserMediaMock },
  });

  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    value: MockMediaRecorder,
  });
});

beforeEach(() => {
  getMessagesMock.mockReset();
  initializeMock.mockReset();
  sendTextMock.mockReset();
  sendAudioMock.mockReset();
  getUserMediaMock.mockReset();
  getMessagesMock.mockResolvedValue(makeConversation());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OnboardingChat', () => {
  it('loads the transcript once when the screen mounts', async () => {
    getMessagesMock.mockResolvedValue(
      makeConversation({
        messages: [
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Loaded from history',
            createdAt: '2026-03-27T12:00:00.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(getMessagesMock).toHaveBeenCalledWith(mockClient);
    });

    expect(screen.getByText('Loaded from history')).toBeInTheDocument();
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it('deduplicates the initial transcript bootstrap under StrictMode', async () => {
    getMessagesMock.mockResolvedValue(makeConversation());

    render(
      createElement(
        StrictMode,
        null,
        createElement(OnboardingChat, { onComplete: vi.fn() }),
      ),
    );

    await waitFor(() => {
      expect(getMessagesMock).toHaveBeenCalledTimes(1);
    });
  });

  it('initializes once for an uninitialized thread and merges the response idempotently', async () => {
    const response = deferred<InitializeOnboardingConversationResponse>();
    const existingMessage = {
      id: 'assistant-1',
      role: 'assistant' as const,
      content: 'Welcome to Acme.',
      createdAt: '2026-03-27T12:00:00.000Z',
    };

    getMessagesMock.mockResolvedValue(
      makeConversation({
        isInitialized: false,
        messages: [existingMessage],
      }),
    );
    initializeMock.mockReturnValue(response.promise);

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-init-skeleton')).toBeInTheDocument();
      expect(initializeMock).toHaveBeenCalledTimes(1);
    });

    response.resolve({
      company: null,
      onboarding: {
        requiresOnboarding: true,
        step: 'assistant-chat',
      },
      initialized: true,
      assistantMessage: existingMessage,
    });

    await waitFor(() => {
      expect(screen.queryByTestId('assistant-init-skeleton')).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('Welcome to Acme.')).toHaveLength(1);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('skips initialization for an existing thread', async () => {
    getMessagesMock.mockResolvedValue(
      makeConversation({
        messages: [
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Existing message',
            createdAt: '2026-03-27T12:00:00.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByText('Existing message')).toBeInTheDocument();
    });

    expect(initializeMock).not.toHaveBeenCalled();
  });

  it('restores focus after a successful text send', async () => {
    sendTextMock.mockResolvedValue(makeSendResponse({ userMessageId: 'user-2' }));

    // First call returns initialized conversation, subsequent calls (polling) return assistant message
    getMessagesMock.mockResolvedValueOnce(
      makeConversation({
        messages: [],
        isInitialized: true,
      }),
    );
    getMessagesMock.mockResolvedValue(
      makeConversation({
        messages: [
          {
            id: 'user-2',
            role: 'user',
            content: 'We install kitchen cabinets.',
            createdAt: '2026-03-27T12:01:00.000Z',
          },
          {
            id: 'assistant-2',
            role: 'assistant',
            content: 'What areas do you serve?',
            createdAt: '2026-03-27T12:01:01.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'We install kitchen cabinets.' },
    });

    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });
    sendButton.focus();
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendTextMock).toHaveBeenCalledWith(
        { message: 'We install kitchen cabinets.' },
        mockClient,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('What areas do you serve?')).toBeInTheDocument();
    });

    expect(textarea).toHaveFocus();
  });

  it('restores the draft and focus after a text send failure', async () => {
    sendTextMock.mockRejectedValue(new Error('Network failed.'));

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'We serve restaurants.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      expect(screen.getByText('Network failed.')).toBeInTheDocument();
    });

    expect(textarea).toHaveValue('We serve restaurants.');
    expect(textarea).toHaveFocus();
  });

  it('records audio, shows a preview, and replaces the pending placeholder with the transcribed result', async () => {
    const stopTrack = vi.fn();
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);
    sendAudioMock.mockResolvedValue(makeSendResponse({ userMessageId: 'user-audio-1' }));

    // First call loads initial conversation, subsequent calls (polling) return audio message
    getMessagesMock.mockResolvedValueOnce(
      makeConversation({
        messages: [],
        isInitialized: true,
      }),
    );
    getMessagesMock.mockResolvedValue(
      makeConversation({
        messages: [
          {
            id: 'user-audio-1',
            role: 'user',
            content: 'We handle emergency plumbing repairs.',
            createdAt: '2026-03-27T12:02:00.000Z',
          },
          {
            id: 'assistant-audio-1',
            role: 'assistant',
            content: 'Do you offer 24/7 service?',
            createdAt: '2026-03-27T12:02:01.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const micButton = screen.getByRole('button', { name: 'Iniciar gravação' });
    fireEvent.click(micButton);

    const stopButton = await screen.findByRole('button', { name: 'Parar gravação' });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar áudio' }));

    await waitFor(() => {
      expect(screen.getByTestId('audio-transcribing-placeholder')).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.queryByText('Áudio gravado')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('We handle emergency plumbing repairs.')).toBeInTheDocument();
      expect(screen.getByText('Do you offer 24/7 service?')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('audio-transcribing-placeholder')).not.toBeInTheDocument();
    expect(screen.queryByText('Áudio gravado')).not.toBeInTheDocument();
    expect(stopTrack).toHaveBeenCalled();
  });

  it('keeps polling after audio upload until the assistant reply arrives', async () => {
    vi.useFakeTimers();

    const firstPoll = makeConversation({
      isTyping: true,
      messages: [
        {
          id: 'user-audio-1',
          role: 'user',
          content: 'We handle emergency plumbing repairs.',
          createdAt: '2026-03-27T12:02:00.000Z',
        },
      ],
    });
    const secondPoll = makeConversation({
      isTyping: false,
      messages: [
        {
          id: 'user-audio-1',
          role: 'user',
          content: 'We handle emergency plumbing repairs.',
          createdAt: '2026-03-27T12:02:00.000Z',
        },
        {
          id: 'assistant-audio-1',
          role: 'assistant',
          content: 'Do you offer 24/7 service?',
          createdAt: '2026-03-27T12:02:01.000Z',
        },
      ],
    });

    getMessagesMock
      .mockResolvedValueOnce(firstPoll)
      .mockResolvedValueOnce(secondPoll);

    const onPoll = vi.fn();
    const onSuccess = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useOnboardingPolling({
        enabled: true,
        client: mockClient,
        expectedAssistantCount: 0,
        pendingUserMessageId: 'user-audio-1',
        intervalMs: 2000,
        timeoutMs: 30000,
        onPoll,
        onSuccess,
        onTimeout,
      }),
    );

    await vi.runAllTicks();

    expect(onPoll).toHaveBeenCalledWith(firstPoll);
    expect(onSuccess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    await vi.runAllTicks();

    expect(onPoll).toHaveBeenLastCalledWith(secondPoll);
    expect(onSuccess).toHaveBeenCalledWith(secondPoll);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('shows the transcribed user audio message as soon as polling returns it, before the assistant reply arrives', async () => {
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    sendAudioMock.mockResolvedValue(makeSendResponse({ userMessageId: 'user-audio-1' }));

    getMessagesMock.mockResolvedValueOnce(
      makeConversation({
        messages: [],
        isInitialized: true,
      }),
    );
    getMessagesMock.mockResolvedValueOnce(
      makeConversation({
        isTyping: true,
        messages: [
          {
            id: 'user-audio-1',
            role: 'user',
            content: 'We handle emergency plumbing repairs.',
            createdAt: '2026-03-27T12:02:00.000Z',
          },
        ],
      }),
    );
    getMessagesMock.mockResolvedValue(
      makeConversation({
        isTyping: false,
        messages: [
          {
            id: 'user-audio-1',
            role: 'user',
            content: 'We handle emergency plumbing repairs.',
            createdAt: '2026-03-27T12:02:00.000Z',
          },
          {
            id: 'assistant-audio-1',
            role: 'assistant',
            content: 'Do you offer 24/7 service?',
            createdAt: '2026-03-27T12:02:01.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar gravação' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Parar gravação' }));

    await waitFor(() => {
      expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar áudio' }));

    await waitFor(() => {
      expect(
        screen.getByText('We handle emergency plumbing repairs.'),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId('audio-transcribing-placeholder')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Do you offer 24/7 service?')).toBeInTheDocument();
    });
  });

  it('restores the audio preview after an audio send failure', async () => {
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    sendAudioMock.mockRejectedValue(new Error('Transcription failed.'));

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar gravação' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Parar gravação' }));

    await waitFor(() => {
      expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar áudio' }));

    await waitFor(() => {
      expect(screen.getByText('Transcription failed.')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('audio-transcribing-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    expect(textarea).toHaveFocus();
  });

  it('surfaces recorder start failures in the shared chat error banner', async () => {
    getUserMediaMock.mockRejectedValue(new Error('Microphone permission denied.'));

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar gravação' }));

    await waitFor(() => {
      expect(screen.getByText('Microphone permission denied.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Iniciar gravação' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Parar gravação' })).not.toBeInTheDocument();
    expect(textarea).toHaveFocus();
  });

  it('deletes the audio preview and refocuses the composer', async () => {
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar gravação' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Parar gravação' }));

    await waitFor(() => {
      expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(screen.queryByText('Áudio gravado')).not.toBeInTheDocument();
    });

    expect(textarea).toHaveFocus();
  });

  it('supports hold-to-record via keyboard interactions', async () => {
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const micButton = screen.getByRole('button', { name: 'Iniciar gravação' });
    fireEvent.keyDown(micButton, { key: 'Enter' });

    expect(await screen.findByRole('button', { name: 'Parar gravação' })).toBeInTheDocument();

    fireEvent.keyUp(screen.getByRole('button', { name: 'Parar gravação' }), {
      key: 'Enter',
    });

    await waitFor(() => {
      expect(screen.getByText('Áudio gravado')).toBeInTheDocument();
    });
  });

  it('replaces the composer with a CTA after onboarding completion', async () => {
    const onComplete = vi.fn();

    sendTextMock.mockResolvedValue(makeSendResponse({ userMessageId: 'user-complete' }));

    // First call loads initial conversation, subsequent calls (polling) return completion
    getMessagesMock.mockResolvedValueOnce(
      makeConversation({
        messages: [],
        isInitialized: true,
      }),
    );
    getMessagesMock.mockResolvedValue(
      makeConversation({
        messages: [
          {
            id: 'user-complete',
            role: 'user',
            content: 'Pode concluir.',
            createdAt: '2026-03-27T12:03:00.000Z',
          },
        ],
        onboarding: {
          requiresOnboarding: false,
          step: 'complete',
        },
      }),
    );

    render(createElement(OnboardingChat, { onComplete }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Pode concluir.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Ir para a home' }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Onboarding concluído.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a home' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the completion CTA immediately when the persisted onboarding state is already complete', async () => {
    getMessagesMock.mockResolvedValue(
      makeConversation({
        isInitialized: true,
        onboarding: {
          requiresOnboarding: false,
          step: 'complete',
        },
        messages: [
          {
            id: 'assistant-complete',
            role: 'assistant',
            content: 'Tudo certo por aqui.',
            createdAt: '2026-03-27T12:04:00.000Z',
          },
        ],
      }),
    );

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Ir para a home' }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Tudo certo por aqui.')).toBeInTheDocument();
  });
});
