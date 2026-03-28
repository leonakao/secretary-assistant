import type { OnboardingMessage } from '../../../api/onboarding.api';

export type ComposerState =
  | 'idle'
  | 'initializing'
  | 'sending-text'
  | 'recording-audio'
  | 'audio-preview'
  | 'sending-audio';

export type PendingTranscriptItem =
  | { id: string; kind: 'assistant-loading' }
  | { id: string; kind: 'user-audio-transcribing' };

export type TranscriptItem = OnboardingMessage | PendingTranscriptItem;

export interface AudioPreviewState {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}
