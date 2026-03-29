const AUDIO_MIME_TYPE_ALIASES: Record<string, string> = {
  'application/ogg': 'audio/ogg',
  'audio/m4a': 'audio/mp4',
  'audio/opus': 'audio/ogg',
  'audio/x-m4a': 'audio/mp4',
  'video/webm': 'audio/webm',
};

export const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-wav',
]);

export function normalizeAudioMimeType(mimeType: string): string {
  const normalizedMimeType = mimeType.toLowerCase().split(';')[0].trim();

  return AUDIO_MIME_TYPE_ALIASES[normalizedMimeType] ?? normalizedMimeType;
}

export function isSupportedAudioMimeType(mimeType: string): boolean {
  return SUPPORTED_AUDIO_MIME_TYPES.has(normalizeAudioMimeType(mimeType));
}
