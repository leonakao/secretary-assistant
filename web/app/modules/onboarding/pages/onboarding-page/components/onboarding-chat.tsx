import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useApiClient } from '~/lib/api-client-context';
import {
  getOnboardingMessages,
  initializeOnboardingConversation,
  sendOnboardingAudioMessage,
  sendOnboardingTextMessage,
  type OnboardingMessage,
} from '../../../api/onboarding.api';
import { OnboardingAudioPreview } from './onboarding-audio-preview';
import { OnboardingComposer } from './onboarding-composer';
import { OnboardingChatErrorBanner } from './onboarding-chat-error-banner';
import { OnboardingTranscript } from './onboarding-transcript';
import type { ComposerState, TranscriptItem } from './onboarding-chat.types';
import { mergeMessagesIdempotently } from './onboarding-chat.utils';
import { useOnboardingAudioRecorder } from './use-onboarding-audio-recorder';

interface OnboardingChatProps {
  onComplete: () => void;
}

const COMPLETION_REDIRECT_DELAY_MS = 3000;

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const client = useApiClient();
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [draftText, setDraftText] = useState('');
  const [composerState, setComposerState] = useState<ComposerState>('loading-history');
  const [error, setError] = useState<string | null>(null);
  const [pendingAudioMessageId, setPendingAudioMessageId] = useState<string | null>(null);
  const [isConversationInitialized, setIsConversationInitialized] = useState(false);
  const [hasLoadedConversation, setHasLoadedConversation] = useState(false);
  const {
    audioPreview,
    previewUrl,
    recordingDurationMs,
    startRecording,
    stopRecording,
    clearAudioPreview,
    recorderError,
  } = useOnboardingAudioRecorder();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializeAttemptedRef = useRef(false);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBusy =
    composerState === 'loading-history' ||
    composerState === 'initializing' ||
    composerState === 'sending-text' ||
    composerState === 'sending-audio' ||
    composerState === 'completing';
  const isInputDisabled = isBusy || composerState === 'recording-audio';
  const transcriptItems = useMemo<TranscriptItem[]>(() => {
    const baseItems: TranscriptItem[] = [...messages];

    if (composerState === 'initializing') {
      baseItems.push({ id: 'assistant-loading', kind: 'assistant-loading' });
    }

    if (pendingAudioMessageId) {
      baseItems.push({
        id: pendingAudioMessageId,
        kind: 'user-audio-transcribing',
      });
    }

    return baseItems;
  }, [composerState, messages, pendingAudioMessageId]);

  const focusComposer = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const adjustTextareaHeight = () => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadConversation = async () => {
      setComposerState('loading-history');
      setError(null);

      try {
        const conversation = await getOnboardingMessages(client);

        if (isCancelled) {
          return;
        }

        const nextMessages = conversation?.messages ?? [];
        const nextIsInitialized = conversation?.isInitialized ?? false;

        setMessages(nextMessages);
        setIsConversationInitialized(nextIsInitialized);
        setHasLoadedConversation(true);
        setComposerState(nextIsInitialized ? 'idle' : 'initializing');
      } catch (cause) {
        if (isCancelled) {
          return;
        }

        setHasLoadedConversation(true);
        setComposerState('idle');
        setError(
          cause instanceof Error
            ? cause.message
            : 'Failed to load onboarding messages. Please try again.',
        );
      }
    };

    void loadConversation();

    return () => {
      isCancelled = true;
    };
  }, [client]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [draftText]);

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [transcriptItems]);

  useEffect(() => {
    if (composerState !== 'recording-audio' || !audioPreview) {
      return;
    }

    setComposerState('audio-preview');
  }, [audioPreview, composerState]);

  useEffect(() => {
    if (!recorderError) {
      return;
    }

    if (composerState === 'recording-audio') {
      setComposerState('idle');
    }

    setError(recorderError);
    focusComposer();
  }, [composerState, recorderError]);

  const runConversationInitialization = async () => {
    initializeAttemptedRef.current = true;
    setComposerState('initializing');
    setError(null);

    try {
      const response = await initializeOnboardingConversation(client);
      const { assistantMessage } = response;

      if (assistantMessage) {
        setMessages((currentMessages) =>
          mergeMessagesIdempotently(currentMessages, [assistantMessage]),
        );
      }

      setIsConversationInitialized(true);
      setComposerState('idle');
      focusComposer();

      handleOnboardingStepChange(response.onboarding.step);
    } catch (cause) {
      setComposerState('idle');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to start the onboarding conversation. Please try again.',
      );
      focusComposer();
      throw cause;
    }
  };

  useEffect(() => {
    if (
      !hasLoadedConversation ||
      isConversationInitialized ||
      initializeAttemptedRef.current
    ) {
      return;
    }

    void runConversationInitialization().catch(() => undefined);
  }, [client, hasLoadedConversation, isConversationInitialized]);

  const handleOnboardingStepChange = (
    step: 'company-bootstrap' | 'assistant-chat' | 'complete',
  ) => {
    if (step !== 'complete') {
      return;
    }

    setComposerState('completing');
    setError(null);
    completionTimeoutRef.current = setTimeout(() => {
      onComplete();
    }, COMPLETION_REDIRECT_DELAY_MS);
  };

  const handleTextSend = async () => {
    const message = draftText.trim();

    if (!message || isBusy || composerState === 'recording-audio' || composerState === 'audio-preview') {
      return;
    }

    const optimisticUserMessage: OnboardingMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setComposerState('sending-text');
    setError(null);
    setDraftText('');
    setMessages((currentMessages) => [...currentMessages, optimisticUserMessage]);

    try {
      const response = await sendOnboardingTextMessage({ message }, client);

      setMessages((currentMessages) => {
        const withoutOptimistic = currentMessages.filter(
          (currentMessage) => currentMessage.id !== optimisticUserMessage.id,
        );

        return mergeMessagesIdempotently(withoutOptimistic, [
          response.userMessage,
          response.assistantMessage,
        ]);
      });
      setIsConversationInitialized(true);
      handleOnboardingStepChange(response.onboarding.step);

      if (response.onboarding.step !== 'complete') {
        setComposerState('idle');
        focusComposer();
      }
    } catch (cause) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) => currentMessage.id !== optimisticUserMessage.id,
        ),
      );
      setDraftText(message);
      setComposerState('idle');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to send message. Please try again.',
      );
      focusComposer();
    }
  };

  const handleStopRecording = () => {
    if (composerState !== 'recording-audio') {
      return;
    }

    stopRecording();
  };

  const handleStartRecording = async () => {
    if (
      isBusy ||
      composerState === 'recording-audio' ||
      composerState === 'audio-preview'
    ) {
      return;
    }

    setError(null);
    const didStartRecording = await startRecording();

    if (didStartRecording) {
      setComposerState('recording-audio');
    }
  };

  const handleDeleteAudioPreview = () => {
    if (!audioPreview || composerState === 'sending-audio') {
      return;
    }

    clearAudioPreview();
    setComposerState('idle');
    setError(null);
    focusComposer();
  };

  const handleAudioSend = async () => {
    if (!audioPreview || isBusy || composerState !== 'audio-preview') {
      return;
    }

    const pendingId = `pending-audio-${Date.now()}`;

    setComposerState('sending-audio');
    setPendingAudioMessageId(pendingId);
    setError(null);

    try {
      const response = await sendOnboardingAudioMessage(
        {
          audio: audioPreview.blob,
          durationMs: audioPreview.durationMs,
          mimeType: audioPreview.mimeType,
        },
        client,
      );

      clearAudioPreview();
      setPendingAudioMessageId(null);
      setMessages((currentMessages) =>
        mergeMessagesIdempotently(currentMessages, [
          response.userMessage,
          response.assistantMessage,
        ]),
      );
      setIsConversationInitialized(true);
      handleOnboardingStepChange(response.onboarding.step);

      if (response.onboarding.step !== 'complete') {
        setComposerState('idle');
        focusComposer();
      }
    } catch (cause) {
      setPendingAudioMessageId(null);
      setComposerState('audio-preview');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to send audio. Please try again.',
      );
      focusComposer();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleTextSend();
    }
  };

  const handleRecordingButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (
      event.repeat ||
      (event.key !== ' ' && event.key !== 'Enter') ||
      composerState === 'recording-audio'
    ) {
      return;
    }

    event.preventDefault();
    void handleStartRecording();
  };

  const handleRecordingButtonKeyUp = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== ' ' && event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleStopRecording();
  };

  return (
    <div className="flex h-full flex-col" data-testid="onboarding-chat">
      <OnboardingTranscript items={transcriptItems} bottomRef={bottomRef} />

      <OnboardingChatErrorBanner
        error={error}
        showRetry={!isConversationInitialized && composerState === 'idle'}
        onRetry={
          !isConversationInitialized && composerState === 'idle'
            ? () => {
                void runConversationInitialization().catch(() => undefined);
              }
            : null
        }
      />

      <div className="border-t border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {audioPreview ? (
            <OnboardingAudioPreview
              audioPreview={audioPreview}
              previewUrl={previewUrl}
              canSend={composerState === 'audio-preview'}
              onDelete={handleDeleteAudioPreview}
              onSend={() => void handleAudioSend()}
            />
          ) : null}

          <OnboardingComposer
            ref={textareaRef}
            draftText={draftText}
            composerState={composerState}
            isBusy={isBusy}
            isInputDisabled={isInputDisabled}
            recordingDurationMs={recordingDurationMs}
            onDraftTextChange={setDraftText}
            onKeyDown={handleKeyDown}
            onStartRecording={() => {
              void handleStartRecording();
            }}
            onStopRecording={handleStopRecording}
            onRecordingButtonKeyDown={handleRecordingButtonKeyDown}
            onRecordingButtonKeyUp={handleRecordingButtonKeyUp}
            onSendText={() => {
              void handleTextSend();
            }}
          />
        </div>
      </div>
    </div>
  );
}
