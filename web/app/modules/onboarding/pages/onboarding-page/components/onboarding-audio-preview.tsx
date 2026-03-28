import { Send, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatDuration } from './onboarding-chat.utils';
import type { AudioPreviewState } from './onboarding-chat.types';

interface OnboardingAudioPreviewProps {
  audioPreview: AudioPreviewState;
  previewUrl: string | null;
  canSend: boolean;
  onDelete: () => void;
  onSend: () => void;
}

export function OnboardingAudioPreview({
  audioPreview,
  previewUrl,
  canSend,
  onDelete,
  onSend,
}: OnboardingAudioPreviewProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Recorded audio</p>
        <p className="text-xs text-muted-foreground">
          {formatDuration(audioPreview.durationMs)} · {audioPreview.mimeType}
        </p>
        {previewUrl ? (
          <audio className="mt-2 w-full max-w-sm" controls src={previewUrl}>
            Your browser does not support audio playback.
          </audio>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button size="sm" onClick={onSend} disabled={!canSend}>
          <Send className="h-4 w-4" />
          Send audio
        </Button>
      </div>
    </div>
  );
}
