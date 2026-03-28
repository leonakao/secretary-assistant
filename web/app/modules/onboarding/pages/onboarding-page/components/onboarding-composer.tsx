import { forwardRef } from 'react';
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
            composerState === 'initializing'
              ? 'Starting your onboarding conversation...'
              : composerState === 'recording-audio'
                ? 'Recording audio...'
                : composerState === 'sending-audio'
                  ? 'Transcribing your audio...'
                  : 'Tell the assistant about your business...'
          }
          data-testid="onboarding-chat-input"
          className="flex-1 resize-none bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <Button
          type="button"
          variant={composerState === 'recording-audio' ? 'destructive' : 'outline'}
          size="icon"
          className="mb-0.5 h-8 w-8 shrink-0 rounded-xl"
          aria-label={
            composerState === 'recording-audio'
              ? 'Stop recording'
              : 'Hold to record audio'
          }
          disabled={isBusy || composerState === 'audio-preview'}
          onPointerDown={onStartRecording}
          onPointerUp={onStopRecording}
          onPointerLeave={onStopRecording}
          onPointerCancel={onStopRecording}
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
          aria-label="Send message"
          data-testid="onboarding-chat-send-button"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground/60">
        Press Enter to send · Shift+Enter for new line · Hold the mic to record
        {composerState === 'recording-audio'
          ? ` · Recording ${formatDuration(recordingDurationMs)}`
          : ''}
      </p>
    </>
  );
});
