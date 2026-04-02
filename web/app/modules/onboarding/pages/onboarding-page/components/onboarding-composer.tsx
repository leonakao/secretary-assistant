import { forwardRef, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatDuration } from './onboarding-chat.utils';
import type { ComposerState } from './onboarding-chat.types';

interface OnboardingComposerProps {
  draftText: string;
  composerState: ComposerState;
  isBusy: boolean;
  isInputDisabled: boolean;
  recordingDurationMs: number;
  onDraftTextChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRecordingButtonKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onRecordingButtonKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSendText: () => void;
}

export const OnboardingComposer = forwardRef<
  HTMLTextAreaElement,
  OnboardingComposerProps
>(function OnboardingComposer(
  {
    draftText,
    composerState,
    isBusy,
    isInputDisabled,
    recordingDurationMs,
    onDraftTextChange,
    onKeyDown,
    onStartRecording,
    onStopRecording,
    onRecordingButtonKeyDown,
    onRecordingButtonKeyUp,
    onSendText,
  },
  ref,
) {
  const [isHoldToRecordMode, setIsHoldToRecordMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const syncMode = () => {
      setIsHoldToRecordMode(mediaQuery.matches);
    };

    syncMode();

    mediaQuery.addEventListener('change', syncMode);

    return () => {
      mediaQuery.removeEventListener('change', syncMode);
    };
  }, []);

  const recordingButtonLabel =
    composerState === 'recording-audio'
      ? 'Parar gravação'
      : isHoldToRecordMode
        ? 'Segure para gravar áudio'
        : 'Iniciar gravação';

  return (
    <>
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-2 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/20">
        <textarea
          ref={ref}
          rows={1}
          value={draftText}
          onChange={(event) => onDraftTextChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={isInputDisabled}
          placeholder={
            composerState === 'loading-history'
              ? 'Carregando sua conversa de onboarding...'
              : composerState === 'initializing'
              ? 'Iniciando sua conversa de onboarding...'
              : composerState === 'recording-audio'
                ? 'Gravando áudio...'
                : composerState === 'sending-audio'
                  ? 'Transcrevendo seu áudio...'
                  : composerState === 'completed'
                    ? 'Onboarding concluído.'
                  : 'Conte ao assistente sobre o seu negócio...'
          }
          data-testid="onboarding-chat-input"
          className="flex-1 resize-none bg-transparent py-1 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 sm:text-sm"
        />
        <Button
          type="button"
          variant={composerState === 'recording-audio' ? 'destructive' : 'outline'}
          size="icon"
          className="mb-0.5 h-8 w-8 shrink-0 rounded-xl"
          aria-label={recordingButtonLabel}
          disabled={isBusy || composerState === 'audio-preview'}
          onClick={
            isHoldToRecordMode
              ? undefined
              : composerState === 'recording-audio'
                ? onStopRecording
                : onStartRecording
          }
          onPointerDown={isHoldToRecordMode ? onStartRecording : undefined}
          onPointerUp={isHoldToRecordMode ? onStopRecording : undefined}
          onPointerLeave={isHoldToRecordMode ? onStopRecording : undefined}
          onPointerCancel={isHoldToRecordMode ? onStopRecording : undefined}
          onKeyDown={onRecordingButtonKeyDown}
          onKeyUp={onRecordingButtonKeyUp}
        >
          {composerState === 'recording-audio' ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          onClick={onSendText}
          disabled={
            isInputDisabled ||
            composerState === 'audio-preview' ||
            !draftText.trim()
          }
          size="icon"
          className="mb-0.5 h-8 w-8 shrink-0 rounded-xl"
          aria-label="Enviar mensagem"
          data-testid="onboarding-chat-send-button"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground/60">
        Pressione Enter para enviar · Shift+Enter para quebrar linha ·{' '}
        {isHoldToRecordMode ? 'segure o microfone para gravar' : 'clique no microfone para gravar'}
        {composerState === 'recording-audio'
          ? ` · Gravando ${formatDuration(recordingDurationMs)}`
          : composerState === 'completed'
            ? ' · Conversa finalizada'
          : ''}
      </p>
    </>
  );
});
