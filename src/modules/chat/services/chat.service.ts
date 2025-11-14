import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../entities/memory.entity';
import { LangchainService } from '../../ai/services/langchain.service';
import type { MessageProvider } from '../interfaces/message-provider.interface';
import { EvolutionService } from '../../evolution/services/evolution.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private langchainService: LangchainService,
    @Inject('MESSAGE_PROVIDER')
    private messageProvider: MessageProvider,
    private readonly evolutionService: EvolutionService,
  ) {}

  async sendMessage(params: {
    sessionId: string;
    message: string;
    userId?: string;
    companyId?: string;
    systemPrompt?: string;
  }): Promise<{ response: string; messageId: string }> {
    const { sessionId, message, userId, companyId, systemPrompt } = params;

    const userMemory = await this.memoryRepository.save({
      sessionId,
      userId,
      companyId,
      role: 'user',
      content: message,
    });

    const history = await this.getSessionHistory(sessionId);

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push(...history);
    messages.push({ role: 'user', content: message });

    const aiResponse = await this.langchainService.chatWithHistory(messages);

    await this.memoryRepository.save({
      sessionId,
      userId,
      companyId,
      role: 'assistant',
      content: aiResponse,
    });

    return {
      response: aiResponse,
      messageId: userMemory.id,
    };
  }

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

  async clearSession(sessionId: string): Promise<void> {
    await this.memoryRepository.softDelete({ sessionId });
  }

  async getUserSessions(userId: string): Promise<string[]> {
    const memories = await this.memoryRepository
      .createQueryBuilder('memory')
      .select('DISTINCT memory.sessionId', 'sessionId')
      .where('memory.userId = :userId', { userId })
      .andWhere('memory.deletedAt IS NULL')
      .getMany();

    return memories.map((m) => m.sessionId);
  }

  async getCompanySessions(companyId: string): Promise<string[]> {
    const memories = await this.memoryRepository
      .createQueryBuilder('memory')
      .select('DISTINCT memory.sessionId', 'sessionId')
      .where('memory.companyId = :companyId', { companyId })
      .andWhere('memory.deletedAt IS NULL')
      .getMany();

    return memories.map((m) => m.sessionId);
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

  async buildAIResponse(params: {
    sessionId: string;
    message: string;
    systemPrompt?: string;
  }): Promise<string> {
    const history = await this.getSessionHistory(params.sessionId);

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(...history);
    messages.push({ role: 'user', content: params.message });

    return this.langchainService.chatWithHistory(messages);
  }

  async processAndReply(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    systemPrompt?: string;
  }): Promise<{ message: string }> {
    const {
      sessionId,
      companyId,
      instanceName,
      remoteJid,
      message,
      systemPrompt,
    } = params;

    await this.addMessageToMemory({
      sessionId,
      companyId,
      role: 'user',
      content: message,
    });

    const aiResponse = await this.buildAIResponse({
      sessionId,
      message,
      systemPrompt,
    });

    await this.messageProvider.sendTextMessage({
      instanceName,
      remoteJid,
      text: aiResponse,
    });

    await this.addMessageToMemory({
      sessionId,
      companyId,
      role: 'assistant',
      content: aiResponse,
    });

    return { message: aiResponse };
  }

  async sendReply(params: {
    provider: string;
    instanceName: string;
    remoteJid: string;
    text: string;
  }): Promise<void> {
    const { instanceName, remoteJid, text } = params;

    await this.messageProvider.sendTextMessage({
      instanceName,
      remoteJid,
      text,
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
