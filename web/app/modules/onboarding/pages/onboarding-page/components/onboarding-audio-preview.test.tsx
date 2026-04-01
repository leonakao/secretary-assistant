import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingAudioPreview } from './onboarding-audio-preview';

vi.mock('~/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as Parameters<typeof createElement>[2]),
}));

describe('OnboardingAudioPreview', () => {
  it('updates the displayed duration when the audio metadata reports the real length', () => {
    render(
      <OnboardingAudioPreview
        audioPreview={{
          blob: new Blob(['audio'], { type: 'audio/webm' }),
          durationMs: 7000,
          mimeType: 'audio/webm',
        }}
        previewUrl="blob:preview"
        canSend
        onDelete={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    expect(screen.getByText('0:07 · audio/webm')).toBeInTheDocument();

    const audio = screen.getByText(
      'Seu navegador não suporta reprodução de áudio.',
    ).closest('audio');

    if (!audio) {
      throw new Error('Expected audio element to exist.');
    }

    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 3,
    });

    fireEvent.loadedMetadata(audio);

    expect(screen.getByText('0:03 · audio/webm')).toBeInTheDocument();
  });
});
