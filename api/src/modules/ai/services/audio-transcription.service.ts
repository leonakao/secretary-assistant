import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class AudioTranscriptionService {
  private static readonly SUPPORTED_MIME_TYPES = new Set([
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

  private readonly client: OpenAI;
  private readonly model = 'gpt-4o-mini-transcribe';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  async transcribeAudio(
    audio: Buffer | string,
    mimeType: string,
  ): Promise<string> {
    const normalizedMimeType = this.normalizeMimeType(mimeType);
    const file = await toFile(
      this.getAudioBuffer(audio),
      this.getFilenameForMimeType(normalizedMimeType),
      {
        type: normalizedMimeType,
      },
    );

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
      language: 'pt',
      prompt:
        'Transcreva este audio em portugues brasileiro. Retorne apenas o texto transcrito, sem comentarios adicionais.',
    });

    return transcription.text.trim();
  }

  private normalizeMimeType(mimeType: string): string {
    const normalizedMimeType = mimeType.toLowerCase().split(';')[0].trim();

    if (
      !normalizedMimeType ||
      !AudioTranscriptionService.SUPPORTED_MIME_TYPES.has(normalizedMimeType)
    ) {
      throw new BadRequestException('Unsupported audio MIME type');
    }

    return normalizedMimeType;
  }

  private getAudioBuffer(audio: Buffer | string): Buffer {
    return Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'base64');
  }

  private getFilenameForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/aac': 'aac',
      'audio/flac': 'flac',
      'audio/mp3': 'mp3',
      'audio/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/mpga': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/x-wav': 'wav',
    };

    return `audio.${extensions[mimeType] ?? 'wav'}`;
  }
}
