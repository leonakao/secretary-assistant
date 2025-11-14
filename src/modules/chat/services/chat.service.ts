import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity';
import type { MessageProvider } from '../interfaces/message-provider.interface';
import { EvolutionService } from '../../evolution/services/evolution.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    @Inject('MESSAGE_PROVIDER')
    private readonly messageProvider: MessageProvider,
    private readonly evolutionService: EvolutionService,
  ) {}

  async getSessionHistory(
    sessionId: string,
  ): Promise<
    Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  > {
    const memories = await this.memoryRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return memories.map((memory) => ({
      role: memory.role,
      content: memory.content,
    }));
  }

  async getSession(sessionId: string): Promise<Memory[]> {
    return this.memoryRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async addMessageToMemory(params: {
    sessionId: string;
    companyId?: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<Memory> {
    return this.memoryRepository.save({
      sessionId: params.sessionId,
      companyId: params.companyId,
      role: params.role,
      content: params.content,
    });
  }

  async sendMessageAndSaveToMemory(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
  }): Promise<void> {
    const { sessionId, companyId, instanceName, remoteJid, message } = params;

    const messageToSave = message.trim();
    if (!messageToSave) return;

    await this.messageProvider.sendTextMessage({
      instanceName,
      remoteJid,
      text: messageToSave,
    });

    await this.addMessageToMemory({
      sessionId,
      companyId,
      role: 'assistant',
      content: messageToSave,
    });
  }

  async sendPresenceNotification(params: {
    instanceName: string;
    remoteJid: string;
    presence?: 'composing' | 'recording';
    delayMs?: number;
  }): Promise<void> {
    await this.evolutionService.sendPresence({
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      presence: params.presence,
      delayMs: params.delayMs ?? 1000,
    });
  }
}
