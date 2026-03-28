import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

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

  private readonly model: ChatGoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    });
  }

  async transcribeAudio(
    audio: Buffer | string,
    mimeType: string,
  ): Promise<string> {
    const normalizedMimeType = this.normalizeMimeType(mimeType);
    const audioBase64 = Buffer.isBuffer(audio)
      ? audio.toString('base64')
      : audio;

    const message = new HumanMessage({
      content: [
        {
          type: 'text',
          text: 'Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem comentários adicionais.',
        },
        {
          type: 'media',
          mimeType: normalizedMimeType,
          data: audioBase64,
        },
      ],
    });

    const response = await this.model.invoke([message]);

    const transcription: string = Array.isArray(response.content)
      ? (response.content[0].text as string)
      : response.content.toString().trim();

    return transcription;
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
}
