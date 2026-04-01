import type { OnboardingMessage } from '../../../api/onboarding.api';

export type ComposerState =
  | 'idle'
  | 'loading-history'
  | 'initializing'
  | 'sending-text'
  | 'awaiting-reply'
  | 'recording-audio'
  | 'audio-preview'
  | 'sending-audio'
  | 'completing';

export type PendingTranscriptItem =
  | { id: string; kind: 'assistant-initializing' }
  | { id: string; kind: 'assistant-typing' }
  | { id: string; kind: 'user-audio-transcribing' };

export type TranscriptItem = OnboardingMessage | PendingTranscriptItem;

export interface AudioPreviewState {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}
