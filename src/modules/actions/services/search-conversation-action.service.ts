import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SearchConversationAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Memory } from '../../chat/entities/memory.entity';
import { ChatService } from '../../chat/services/chat.service';
import { assistantOwnerPromptWithInstructions } from '../../ai/agent-prompts/assistant-owner';
import { RecipientFinderService } from './recipient-finder.service';

@Injectable()
export class SearchConversationActionService {
  private readonly logger = new Logger(SearchConversationActionService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
    private chatService: ChatService,
    private recipientFinderService: RecipientFinderService,
  ) {}

  async execute(
    action: SearchConversationAction,
    context: {
      companyId: string;
      instanceName: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult> {
    const { contactName, contactPhone, query, days = 3 } = action.payload;

    try {
      const result = await this.recipientFinderService.findRecipient(
        context.companyId,
        contactName,
        contactPhone,
      );

      if (!result.recipient || result.type !== 'contact') {
        const errorMsg = result.multipleRecipients
          ? `Encontrei ${result.multipleRecipients.length} pessoas com o nome "${contactName}". Por favor, seja mais específico.`
          : `Não consegui encontrar o contato ${contactName || contactPhone}`;

        await this.notifyOwner(context.userId, context.instanceName, errorMsg);

        return {
          success: false,
          action,
          error: errorMsg,
        };
      }

      const contact = result.recipient as Contact;

      const conversationHistory = await this.getConversationHistory(
        contact.id,
        days,
      );

      if (conversationHistory.length === 0) {
        const errorMsg = `Não encontrei conversas com ${contact.name} nos últimos ${days} dias`;

        await this.notifyOwner(context.userId, context.instanceName, errorMsg);

        return {
          success: false,
          action,
          error: errorMsg,
        };
      }

      const answer = await this.searchInConversation(
        contact,
        conversationHistory,
        query,
        context.companyId,
      );

      await this.notifyOwner(context.userId, context.instanceName, answer);

      this.logger.log(
        `Searched conversation with ${contact.name} for: "${query}"`,
      );

      return {
        success: true,
        action,
        message: 'Conversation searched successfully',
        data: {
          contactId: contact.id,
          contactName: contact.name,
          messagesAnalyzed: conversationHistory.length,
          answer,
        },
      };
    } catch (error) {
      this.logger.error('Error searching conversation:', error);
      return {
        success: false,
        action,
        error: error.message || 'Unknown error',
      };
    }
  }

  private async getConversationHistory(
    contactId: string,
    days: number,
  ): Promise<Memory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const memories = await this.memoryRepository.find({
      where: {
        sessionId: contactId,
        createdAt: MoreThan(cutoffDate),
      },
      order: { createdAt: 'ASC' },
    });

    return memories;
  }

  private async searchInConversation(
    contact: Contact,
    conversationHistory: Memory[],
    query: string,
    companyId: string,
  ): Promise<string> {
    const conversationText = conversationHistory
      .map((m) => {
        const role = m.role === 'user' ? 'Human' : 'AI';
        const timestamp = m.createdAt.toLocaleString('pt-BR');
        return `[${timestamp}] ${role}: ${m.content}`;
      })
      .join('\n');

    const instructions = `Você precisa analisar a conversa abaixo e responder a seguinte pergunta:

"${query}"

CONVERSA COM ${contact.name.toUpperCase()}:
${conversationText}

INSTRUÇÕES:
- Analise toda a conversa cuidadosamente
- Responda de forma clara e direta
- Se a informação não estiver na conversa, diga que não encontrou
- Cite partes relevantes da conversa se necessário
- Seja específico com datas e horários quando mencionados
- Mantenha um tom profissional e objetivo`;

    const owner = await this.userRepository.findOneByOrFail({
      id: contact.companyId,
    });

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const systemPrompt = assistantOwnerPromptWithInstructions(
      owner,
      instructions,
      company.description,
    );

    const answer = await this.chatService.buildAIResponse({
      sessionId: owner.id,
      message: query,
      systemPrompt,
    });

    return answer;
  }

  private async notifyOwner(
    userId: string,
    instanceName: string,
    message: string,
  ): Promise<void> {
    const owner = await this.userRepository.findOneByOrFail({ id: userId });

    if (!owner.phone) {
      this.logger.warn(`Owner ${userId} has no phone to receive notification`);
      return;
    }

    const ownerRemoteJid = this.buildRemoteJid(owner.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: userId,
      companyId: '',
      instanceName,
      remoteJid: ownerRemoteJid,
      message,
    });
  }

  private buildRemoteJid(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;
    return `${phoneWithoutPlus}@s.whatsapp.net`;
  }
}
