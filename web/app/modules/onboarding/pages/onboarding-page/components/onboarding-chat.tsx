import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '~/components/ui/button';
import { useApiClient } from '~/lib/api-client-context';
import {
  getOnboardingMessages,
  initializeOnboardingConversation,
  sendOnboardingAudioMessage,
  sendOnboardingTextMessage,
  type OnboardingConversation,
  type OnboardingMessage,
} from '../../../api/onboarding.api';
import { OnboardingAudioPreview } from './onboarding-audio-preview';
import { OnboardingComposer } from './onboarding-composer';
import { OnboardingChatErrorBanner } from './onboarding-chat-error-banner';
import { OnboardingTranscript } from './onboarding-transcript';
import type { ComposerState, TranscriptItem } from './onboarding-chat.types';
import { mergeMessagesIdempotently } from './onboarding-chat.utils';
import { useOnboardingAudioRecorder } from './use-onboarding-audio-recorder';
import { useOnboardingPolling } from './use-onboarding-polling';

interface OnboardingChatProps {
  onComplete: () => void;
}

let conversationBootstrapPromise: Promise<OnboardingConversation | null> | null = null;

function loadConversationOnce(client: ReturnType<typeof useApiClient>) {
  if (conversationBootstrapPromise) {
    return conversationBootstrapPromise;
  }

  conversationBootstrapPromise = getOnboardingMessages(client).finally(() => {
    conversationBootstrapPromise = null;
  });

  return conversationBootstrapPromise;
}

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
  const pendingAssistantCountRef = useRef<number>(0);
  const pendingUserMessageIdRef = useRef<string | null>(null);
  const lastSentTextRef = useRef<string>('');
  const optimisticMessageIdRef = useRef<string>('');

  const isBusy =
    composerState === 'loading-history' ||
    composerState === 'initializing' ||
    composerState === 'sending-text' ||
    composerState === 'awaiting-reply' ||
    composerState === 'sending-audio' ||
    composerState === 'completed';
  const isInputDisabled = isBusy || composerState === 'recording-audio';
  const transcriptItems = useMemo<TranscriptItem[]>(() => {
    const baseItems: TranscriptItem[] = [...messages];

    if (composerState === 'initializing') {
      baseItems.push({
        id: 'assistant-initializing',
        kind: 'assistant-initializing',
      });
    }

    if (composerState === 'awaiting-reply') {
      baseItems.push({
        id: 'assistant-typing',
        kind: 'assistant-typing',
      });
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
    let isCancelled = false;

    const loadConversation = async () => {
      setComposerState('loading-history');
      setError(null);

      try {
        const conversation = await loadConversationOnce(client);

        if (isCancelled) {
          return;
        }

        const nextMessages = conversation?.messages ?? [];
        const nextIsInitialized = conversation?.isInitialized ?? false;
        const nextStep = conversation?.onboarding.step;

        setMessages(nextMessages);
        setIsConversationInitialized(nextIsInitialized);
        setHasLoadedConversation(true);
        setComposerState(
          nextStep === 'complete'
            ? 'completed'
            : nextIsInitialized
              ? 'idle'
              : 'initializing',
        );
      } catch (cause) {
        if (isCancelled) {
          return;
        }

        setHasLoadedConversation(true);
        setComposerState('idle');
        setError(
          cause instanceof Error
            ? cause.message
            : 'Falha ao carregar as mensagens do onboarding. Tente novamente.',
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
      handleOnboardingStepChange(response.onboarding.step);
      if (response.onboarding.step !== 'complete') {
        setComposerState('idle');
        focusComposer();
      }
    } catch (cause) {
      setComposerState('idle');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Falha ao iniciar a conversa de onboarding. Tente novamente.',
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

    setComposerState('completed');
    setError(null);
  };

  const handlePollResponse = useCallback((conversation: OnboardingConversation) => {
    setMessages(conversation.messages);

    if (
      pendingUserMessageIdRef.current !== null &&
      conversation.messages.some(
        (message) => message.id === pendingUserMessageIdRef.current,
      )
    ) {
      setPendingAudioMessageId(null);
    }
  }, []);

  const handlePollSuccess = useCallback(
    (conversation: OnboardingConversation) => {
      setMessages(conversation.messages);
      handleOnboardingStepChange(conversation.onboarding.step);
      if (conversation.onboarding.step !== 'complete') {
        setComposerState('idle');
      }
      focusComposer();
    },
    [handleOnboardingStepChange],
  );

  const handlePollTimeout = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.id !== optimisticMessageIdRef.current));
    setPendingAudioMessageId(null);
    setComposerState('idle');
    setDraftText(lastSentTextRef.current);
    setError('Nenhuma resposta foi recebida em 30 segundos. Tente novamente.');
  }, []);

  // Polling effect for awaiting-reply state
  useOnboardingPolling({
    enabled: composerState === 'awaiting-reply',
    client,
    expectedAssistantCount: pendingAssistantCountRef.current,
    pendingUserMessageId: pendingUserMessageIdRef.current,
    intervalMs: 2000,
    timeoutMs: 30000,
    onPoll: handlePollResponse,
    onSuccess: handlePollSuccess,
    onTimeout: handlePollTimeout,
  });

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

    optimisticMessageIdRef.current = optimisticUserMessage.id;
    pendingAssistantCountRef.current = [...messages, optimisticUserMessage].filter(
      (currentMessage) => currentMessage.role === 'assistant',
    ).length;
    pendingUserMessageIdRef.current = null;
    setComposerState('sending-text');
    setError(null);
    setDraftText('');
    setMessages((currentMessages) => [...currentMessages, optimisticUserMessage]);

    try {
      const response = await sendOnboardingTextMessage({ message }, client);

      pendingUserMessageIdRef.current = response.userMessageId;
      lastSentTextRef.current = message;

      setIsConversationInitialized(true);
      setComposerState('awaiting-reply');
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
          : 'Falha ao enviar a mensagem. Tente novamente.',
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

    pendingAssistantCountRef.current = messages.filter(
      (currentMessage) => currentMessage.role === 'assistant',
    ).length;
    pendingUserMessageIdRef.current = null;
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

      pendingUserMessageIdRef.current = response.userMessageId;
      clearAudioPreview();
      setPendingAudioMessageId(response.userMessageId);

      setIsConversationInitialized(true);
      setComposerState('awaiting-reply');
    } catch (cause) {
      setPendingAudioMessageId(null);
      setComposerState('audio-preview');
      setError(
        cause instanceof Error
          ? cause.message
          : 'Falha ao enviar o áudio. Tente novamente.',
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
        showRetry={
          (!isConversationInitialized && composerState === 'idle') ||
          (error !== null && draftText.trim().length > 0 && composerState === 'idle')
        }
        onRetry={
          !isConversationInitialized && composerState === 'idle'
            ? () => {
                void runConversationInitialization().catch(() => undefined);
              }
            : error !== null && draftText.trim().length > 0 && composerState === 'idle'
              ? () => {
                  void handleTextSend();
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

          {composerState === 'completed' ? (
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Onboarding concluído.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sua secretária já está configurada. Quando quiser, entre na área principal para continuar.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onComplete}
                  className="w-full sm:w-auto"
                  data-testid="onboarding-completion-cta"
                >
                  Ir para a home
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
