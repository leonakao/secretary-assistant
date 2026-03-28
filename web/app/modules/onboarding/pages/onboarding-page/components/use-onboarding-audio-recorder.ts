import { useEffect, useRef, useState } from 'react';
import type { AudioPreviewState } from './onboarding-chat.types';

interface UseOnboardingAudioRecorderResult {
  audioPreview: AudioPreviewState | null;
  previewUrl: string | null;
  recordingDurationMs: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  clearAudioPreview: () => void;
  recorderError: string | null;
}

export function useOnboardingAudioRecorder(): UseOnboardingAudioRecorderResult {
  const [audioPreview, setAudioPreview] = useState<AudioPreviewState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  const stopRecordingStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecordingInterval = () => {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const clearAudioPreview = () => {
    revokePreviewUrl();
    setPreviewUrl(null);
    setAudioPreview(null);
    setRecordingDurationMs(0);
    setRecorderError(null);
  };

  const startRecording = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setRecorderError('Audio recording is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      stopRecordingStream();
      stopRecordingInterval();
      clearAudioPreview();

      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecorderError(null);

      recordingIntervalRef.current = window.setInterval(() => {
        if (recordingStartedAtRef.current) {
          setRecordingDurationMs(Date.now() - recordingStartedAtRef.current);
        }
      }, 150);

      recorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener(
        'stop',
        () => {
          const durationMs = recordingStartedAtRef.current
            ? Date.now() - recordingStartedAtRef.current
            : 0;
          const mimeType =
            recorder.mimeType || recordingChunksRef.current[0]?.type || 'audio/unknown';
          const blob = new Blob(recordingChunksRef.current, { type: mimeType });

          stopRecordingInterval();
          stopRecordingStream();
          recorderRef.current = null;
          recordingStartedAtRef.current = null;
          recordingChunksRef.current = [];

          if (blob.size === 0) {
            setRecordingDurationMs(0);
            setRecorderError('Recorded audio was empty. Please try again.');
            return;
          }

          setAudioPreview({
            blob,
            durationMs,
            mimeType,
          });
          setRecordingDurationMs(durationMs);
          setRecorderError(null);
        },
        { once: true },
      );

      recorder.start();
      return true;
    } catch (cause) {
      stopRecordingInterval();
      stopRecordingStream();
      recorderRef.current = null;
      recordingStartedAtRef.current = null;
      setRecordingDurationMs(0);
      setRecorderError(
        cause instanceof Error
          ? cause.message
          : 'Microphone access was denied. Please try again.',
      );
      return false;
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  useEffect(() => {
    revokePreviewUrl();
    setPreviewUrl(null);

    if (!audioPreview) {
      return;
    }

    previewUrlRef.current = URL.createObjectURL(audioPreview.blob);
    setPreviewUrl(previewUrlRef.current);

    return () => {
      revokePreviewUrl();
    };
  }, [audioPreview]);

  useEffect(() => {
    return () => {
      stopRecordingInterval();
      revokePreviewUrl();
      stopRecordingStream();
    };
  }, []);

  return {
    audioPreview,
    previewUrl,
    recordingDurationMs,
    startRecording,
    stopRecording,
    clearAudioPreview,
    recorderError,
  };
}
