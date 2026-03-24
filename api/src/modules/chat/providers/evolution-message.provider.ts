import { Injectable } from '@nestjs/common';
import type { MessageProvider } from '../interfaces/message-provider.interface';
import { EvolutionService } from '../../evolution/services/evolution.service';

@Injectable()
export class EvolutionMessageProvider implements MessageProvider {
  constructor(private evolutionService: EvolutionService) {}

  async sendTextMessage(params: {
    instanceName: string;
    remoteJid: string;
    text: string;
  }): Promise<any> {
    return this.evolutionService.sendTextMessage(params);
  }

  async sendMediaMessage(params: {
    instanceName: string;
    remoteJid: string;
    mediaUrl: string;
    caption?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<any> {
    return this.evolutionService.sendMediaMessage(params);
  }

  async getInstanceStatus(instanceName: string): Promise<any> {
    return this.evolutionService.getInstanceStatus(instanceName);
  }
}
