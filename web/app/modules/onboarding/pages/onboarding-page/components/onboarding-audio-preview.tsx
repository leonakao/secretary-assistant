import { useEffect, useState } from 'react';
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
  const [resolvedDurationMs, setResolvedDurationMs] = useState(audioPreview.durationMs);

  useEffect(() => {
    setResolvedDurationMs(audioPreview.durationMs);
  }, [audioPreview.durationMs]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Áudio gravado</p>
        <p className="text-xs text-muted-foreground">
          {formatDuration(resolvedDurationMs)} · {audioPreview.mimeType}
        </p>
        {previewUrl ? (
          <audio
            className="mt-3 w-full min-w-0 sm:min-w-[22rem] sm:max-w-[32rem]"
            controls
            src={previewUrl}
            onLoadedMetadata={(event) => {
              const durationSeconds = event.currentTarget.duration;

              if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                return;
              }

              setResolvedDurationMs(Math.round(durationSeconds * 1000));
            }}
          >
            Seu navegador não suporta reprodução de áudio.
          </audio>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
        <Button className="w-full sm:w-auto" size="sm" onClick={onSend} disabled={!canSend}>
          <Send className="h-4 w-4" />
          Enviar áudio
        </Button>
      </div>
    </div>
  );
}
