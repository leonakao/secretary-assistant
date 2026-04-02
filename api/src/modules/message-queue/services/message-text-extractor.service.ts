import { Injectable, Logger } from '@nestjs/common';
import type { EvolutionMessagesUpsertPayload } from '../../chat/dto/evolution-message.dto';
import { AudioTranscriptionService } from '../../ai/services/audio-transcription.service';

@Injectable()
export class MessageTextExtractorService {
  private readonly logger = new Logger(MessageTextExtractorService.name);

  constructor(private audioTranscriptionService: AudioTranscriptionService) {}

  /**
   * Extract text from message or transcribe audio if it's an audio message
   */
  async extract(
    payload: EvolutionMessagesUpsertPayload,
  ): Promise<string | null> {
    const { message: messageContent } = payload;

    // Check for text messages first
    const textMessage =
      messageContent?.conversation || messageContent?.extendedTextMessage?.text;

    if (textMessage) {
      return textMessage;
    }

    // Check for audio message
    if (messageContent?.audioMessage?.url) {
      this.logger.log('🎤 Audio message detected, transcribing...');

      const transcription =
        await this.audioTranscriptionService.transcribeAudio(
          messageContent.base64!,
          messageContent.audioMessage.mimetype,
        );

      if (transcription) {
        this.logger.log(`✅ Audio transcribed: "${transcription}"`);
        return transcription;
      } else {
        this.logger.warn('⚠️ Audio transcription returned empty result');
        return '';
      }
    }

    // Unsupported message types such as reactions, protocol updates, etc.
    return null;
  }
}
