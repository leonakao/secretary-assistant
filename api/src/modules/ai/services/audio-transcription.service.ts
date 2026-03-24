import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

@Injectable()
export class AudioTranscriptionService {
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

  /**
   * Transcribe audio from URL to text using Gemini
   */
  async transcribeAudioFromBase64(audioBase64: string): Promise<string> {
    const message = new HumanMessage({
      content: [
        {
          type: 'text',
          text: 'Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem comentários adicionais.',
        },
        {
          type: 'media',
          mimeType: 'audio/ogg',
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
}
