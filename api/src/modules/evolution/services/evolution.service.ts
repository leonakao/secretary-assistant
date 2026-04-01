import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EvolutionCreateInstanceParams {
  instanceName: string;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  token?: string;
  qrcode?: boolean;
  number?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  webhook?: {
    url: string;
    byEvents?: boolean;
    base64?: boolean;
    headers?: Record<string, string>;
    events?: string[];
  };
}

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

  async createInstance(params: EvolutionCreateInstanceParams): Promise<any> {
    const response = await fetch(`${this.evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        rejectCall: true,
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true,
        syncFullHistory: false,
        ...params,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to create instance: ${error}`);
      throw new Error(`Failed to create instance: ${response.statusText}`);
    }

    const result = await response.json();
    this.logger.log(`Instance created successfully: ${params.instanceName}`);
    return result;
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

  async getConnectionPayload(
    instanceName: string,
    number?: string,
  ): Promise<any> {
    const searchParams = new URLSearchParams();

    if (number) {
      searchParams.set('number', number);
    }

    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
    const response = await fetch(
      `${this.evolutionApiUrl}/instance/connect/${instanceName}${suffix}`,
      {
        method: 'GET',
        headers: {
          apikey: this.apiKey,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get connection payload: ${error}`);
      throw new Error(
        `Failed to get connection payload: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async logoutInstance(instanceName: string): Promise<any> {
    const response = await fetch(
      `${this.evolutionApiUrl}/instance/logout/${instanceName}`,
      {
        method: 'DELETE',
        headers: {
          apikey: this.apiKey,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to logout instance: ${error}`);
      throw new Error(`Failed to logout instance: ${response.statusText}`);
    }

    const result = await response.json();
    this.logger.log(`Instance logged out successfully: ${instanceName}`);
    return result;
  }

  async sendPresence(params: {
    instanceName: string;
    remoteJid: string;
    presence?: 'composing' | 'recording' | 'paused';
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
          presence,
          delay: delayMs ?? 0,
          options: {
            delay: delayMs ?? 0,
            presence,
            number: remoteJid,
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
