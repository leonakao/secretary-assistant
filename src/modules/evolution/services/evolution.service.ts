import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly evolutionApiUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.evolutionApiUrl =
      this.configService.get<string>('EVOLUTION_API_URL') ||
      'http://evolution-api:8080';
    this.apiKey = this.configService.getOrThrow<string>('EVOLUTION_API_KEY');
  }

  async sendTextMessage(params: {
    instanceName: string;
    remoteJid: string;
    text: string;
  }): Promise<any> {
    const { instanceName, remoteJid, text } = params;

    const response = await fetch(
      `${this.evolutionApiUrl}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: remoteJid,
          text,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send message: ${error}`);
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const result = await response.json();
    this.logger.log(`Message sent successfully to ${remoteJid}`);
    return result;
  }

  async sendMediaMessage(params: {
    instanceName: string;
    remoteJid: string;
    mediaUrl: string;
    caption?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<any> {
    const {
      instanceName,
      remoteJid,
      mediaUrl,
      caption,
      mediaType = 'image',
    } = params;

    const response = await fetch(
      `${this.evolutionApiUrl}/message/sendMedia/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: remoteJid,
          mediatype: mediaType,
          media: mediaUrl,
          caption,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send media: ${error}`);
      throw new Error(`Failed to send media: ${response.statusText}`);
    }

    const result = await response.json();
    this.logger.log(`Media sent successfully to ${remoteJid}`);
    return result;
  }

  async getInstanceStatus(instanceName: string): Promise<any> {
    const response = await fetch(
      `${this.evolutionApiUrl}/instance/connectionState/${instanceName}`,
      {
        method: 'GET',
        headers: {
          apikey: this.apiKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get instance status: ${response.statusText}`);
    }

    return await response.json();
  }

  async sendPresence(params: {
    instanceName: string;
    remoteJid: string;
    presence?:
      | 'available'
      | 'composing'
      | 'paused'
      | 'recording'
      | 'unavailable';
    delayMs?: number;
  }): Promise<void> {
    const { instanceName, remoteJid, presence = 'composing', delayMs } = params;

    const response = await fetch(
      `${this.evolutionApiUrl}/chat/sendPresence/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: remoteJid,
          options: {
            presence,
            delay: delayMs ?? 0,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send presence: ${error}`);
      throw new Error(`Failed to send presence: ${response.statusText}`);
    }

    this.logger.log(
      `Presence "${presence}" sent successfully to ${remoteJid} (delay: ${delayMs ?? 0}ms)`,
    );
  }
}
