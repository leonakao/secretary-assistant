import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);
  private readonly model: ChatGoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in environment variables');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      temperature: 0.1, // Low temperature for accurate transcription
    });
  }

  /**
   * Transcribe audio from URL to text using Gemini
   */
  async transcribeAudioFromBase64(audioBase64: string): Promise<string> {
    try {
      this.logger.log(`🎤 Transcribing audio from base64`);

      // Step 3: Create message with audio data
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

      // Step 4: Call Gemini model
      this.logger.log('🔄 Calling Gemini for transcription...');
      const response = await this.model.invoke([message]);

      const transcription: string = Array.isArray(response.content)
        ? (response.content[0].text as string)
        : response.content.toString().trim();

      this.logger.log(`✅ Audio transcribed successfully: "${transcription}"`);
      return transcription;
    } catch (error) {
      this.logger.error('❌ Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Download audio file from URL
   */
  private async downloadAudio(url: string): Promise<Buffer> {
    try {
      this.logger.log(`📥 Downloading audio from: ${url}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('Error downloading audio:', error);
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }
}
