import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestHumanContactAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { ChatService } from '../../chat/services/chat.service';
import { assistantOwnerPromptWithInstructions } from '../../ai/agent-prompts/assistant-owner';

@Injectable()
export class RequestHumanContactActionService {
  private readonly logger = new Logger(RequestHumanContactActionService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private chatService: ChatService,
  ) {}

  async execute(
    action: RequestHumanContactAction,
    context: {
      companyId: string;
      instanceName: string;
      contactId: string;
    },
  ): Promise<ActionExecutionResult> {
    const { reason, urgency } = action.payload;

    try {
      const contact = await this.contactRepository.findOneByOrFail({
        id: context.contactId,
      });

      const userToNotify = contact.preferredUserId
        ? await this.userRepository.findOne({
            where: { id: contact.preferredUserId },
          })
        : await this.findCompanyOwner(context.companyId);

      if (!userToNotify) {
        this.logger.warn(
          `No user found to notify for company ${context.companyId}`,
        );
        return {
          success: false,
          action,
          error: 'No user found to notify',
        };
      }

      await this.pauseConversation(context.contactId);

      await this.notifyOwner(
        userToNotify,
        contact,
        context.instanceName,
        context.companyId,
        reason,
        urgency,
      );

      const notifiedUserType = contact.preferredUserId
        ? 'preferred user'
        : 'company owner';

      this.logger.log(
        `Human contact requested by ${contact.name}. Notified ${userToNotify.name} (${notifiedUserType}). Conversation paused for 24h.`,
      );

      return {
        success: true,
        action,
        message: 'Human contact request processed',
        data: {
          contactId: contact.id,
          contactName: contact.name,
          notifiedUserId: userToNotify.id,
          notifiedUserName: userToNotify.name,
          pausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      };
    } catch (error) {
      this.logger.error('Error processing human contact request:', error);
      return {
        success: false,
        action,
        error: error.message || 'Unknown error',
      };
    }
  }

  private async findCompanyOwner(companyId: string): Promise<User | null> {
    const owner = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userCompanies', 'uc')
      .where('uc.companyId = :companyId', { companyId })
      .andWhere('uc.role = :role', { role: 'owner' })
      .getOne();

    return owner;
  }

  private async pauseConversation(contactId: string): Promise<void> {
    const ignoreUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await this.contactRepository.update({ id: contactId }, { ignoreUntil });

    this.logger.log(
      `Conversation paused for contact ${contactId} until ${ignoreUntil.toISOString()}`,
    );
  }

  private async notifyOwner(
    owner: User,
    contact: Contact,
    instanceName: string,
    companyId: string,
    reason?: string,
    urgency?: 'low' | 'medium' | 'high',
  ): Promise<void> {
    const urgencyEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };

    const urgencyLabel = urgency || 'medium';
    const emoji = urgencyEmoji[urgencyLabel];

    const notificationContext = `${emoji} O cliente ${contact.name} solicitou atendimento humano.
${reason ? `Motivo: ${reason}` : ''}
Urgência: ${urgencyLabel}

O atendimento automatizado foi pausado por 24 horas para este cliente.`;

    const instructions = `Notifique o proprietário sobre a solicitação de atendimento humano de um cliente.

${notificationContext}

Comunique isso de forma clara e profissional, sugerindo que o proprietário entre em contato com o cliente.`;

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const systemPrompt = assistantOwnerPromptWithInstructions(
      owner,
      instructions,
      company.description,
    );

    const message = await this.chatService.buildAIResponse({
      sessionId: owner.id,
      message: notificationContext,
      systemPrompt,
    });

    if (!owner.phone) {
      this.logger.warn(
        `Owner ${owner.id} has no phone to receive notification`,
      );
      return;
    }

    const ownerRemoteJid = this.buildRemoteJid(owner.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: owner.id,
      companyId: company.id,
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
