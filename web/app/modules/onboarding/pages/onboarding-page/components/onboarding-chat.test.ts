import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InitializeOnboardingConversationResponse,
  OnboardingConversation,
  SendOnboardingMessageResponse,
} from '../../../api/onboarding.api';
import { OnboardingChat } from './onboarding-chat';
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
    ...overrides,
  };
}

function makeSendResponse(
  overrides: Partial<SendOnboardingMessageResponse> = {},
): SendOnboardingMessageResponse {
  return {
    company: null,
    onboarding: {
      requiresOnboarding: true,
      step: 'assistant-chat',
    },
    userMessage: {
      id: 'user-1',
      role: 'user',
      content: 'User message',
      createdAt: '2026-03-27T12:00:00.000Z',
    },
    assistantMessage: {
      id: 'assistant-1',
      role: 'assistant',
      content: 'Assistant reply',
      createdAt: '2026-03-27T12:00:01.000Z',
    },
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
    sendTextMock.mockResolvedValue(
      makeSendResponse({
        userMessage: {
          id: 'user-2',
          role: 'user',
          content: 'We install kitchen cabinets.',
          createdAt: '2026-03-27T12:01:00.000Z',
        },
        assistantMessage: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'What areas do you serve?',
          createdAt: '2026-03-27T12:01:01.000Z',
        },
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

    const sendButton = screen.getByRole('button', { name: 'Send message' });
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

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByText('Network failed.')).toBeInTheDocument();
    });

    expect(textarea).toHaveValue('We serve restaurants.');
    expect(textarea).toHaveFocus();
  });

  it('records audio, shows a preview, and replaces the pending placeholder with the transcribed result', async () => {
    const audioResponse = deferred<SendOnboardingMessageResponse>();
    const stopTrack = vi.fn();
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);
    sendAudioMock.mockReturnValue(audioResponse.promise);

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const micButton = screen.getByRole('button', { name: 'Hold to record audio' });
    fireEvent.pointerDown(micButton);

    const stopButton = await screen.findByRole('button', { name: 'Stop recording' });
    fireEvent.pointerUp(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Recorded audio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send audio' }));

    await waitFor(() => {
      expect(screen.getByTestId('audio-transcribing-placeholder')).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox')).toBeDisabled();

    audioResponse.resolve(
      makeSendResponse({
        userMessage: {
          id: 'user-audio-1',
          role: 'user',
          content: 'We handle emergency plumbing repairs.',
          createdAt: '2026-03-27T12:02:00.000Z',
        },
        assistantMessage: {
          id: 'assistant-audio-1',
          role: 'assistant',
          content: 'Do you offer 24/7 service?',
          createdAt: '2026-03-27T12:02:01.000Z',
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('We handle emergency plumbing repairs.')).toBeInTheDocument();
      expect(screen.getByText('Do you offer 24/7 service?')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('audio-transcribing-placeholder')).not.toBeInTheDocument();
    expect(screen.queryByText('Recorded audio')).not.toBeInTheDocument();
    expect(stopTrack).toHaveBeenCalled();
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
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold to record audio' }));
    fireEvent.pointerUp(await screen.findByRole('button', { name: 'Stop recording' }));

    await waitFor(() => {
      expect(screen.getByText('Recorded audio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send audio' }));

    await waitFor(() => {
      expect(screen.getByText('Transcription failed.')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('audio-transcribing-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('Recorded audio')).toBeInTheDocument();
    expect(textarea).toHaveFocus();
  });

  it('surfaces recorder start failures in the shared chat error banner', async () => {
    getUserMediaMock.mockRejectedValue(new Error('Microphone permission denied.'));

    render(createElement(OnboardingChat, { onComplete: vi.fn() }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeEnabled();
    });

    const textarea = screen.getByRole('textbox');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold to record audio' }));

    await waitFor(() => {
      expect(screen.getByText('Microphone permission denied.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Hold to record audio' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop recording' })).not.toBeInTheDocument();
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
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold to record audio' }));
    fireEvent.pointerUp(await screen.findByRole('button', { name: 'Stop recording' }));

    await waitFor(() => {
      expect(screen.getByText('Recorded audio')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Recorded audio')).not.toBeInTheDocument();
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

    const micButton = screen.getByRole('button', { name: 'Hold to record audio' });
    fireEvent.keyDown(micButton, { key: 'Enter' });

    expect(await screen.findByRole('button', { name: 'Stop recording' })).toBeInTheDocument();

    fireEvent.keyUp(screen.getByRole('button', { name: 'Stop recording' }), {
      key: 'Enter',
    });

    await waitFor(() => {
      expect(screen.getByText('Recorded audio')).toBeInTheDocument();
    });
  });

  it('blocks the composer and redirects after onboarding completion', async () => {
    const onComplete = vi.fn();

    sendTextMock.mockResolvedValue(
      makeSendResponse({
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
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    expect(screen.getByDisplayValue('')).toBeDisabled();

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 3500 });
  });
});
