import { Injectable } from '@nestjs/common';
import { ConversationStrategy } from './conversation-strategy.interface';
import { ChatService } from '../services/chat.service';

@Injectable()
export class ClientConversationStrategy implements ConversationStrategy {
  constructor(private chatService: ChatService) {}

  async handleConversation(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    systemPrompt: string;
  }): Promise<void> {
    // Simple flow: just process and reply
    // No action detection for clients
    await this.chatService.processAndReply({
      sessionId: params.sessionId,
      companyId: params.companyId,
      instanceName: params.instanceName,
      remoteJid: params.remoteJid,
      message: params.message,
      systemPrompt: params.systemPrompt,
    });
  }
}
