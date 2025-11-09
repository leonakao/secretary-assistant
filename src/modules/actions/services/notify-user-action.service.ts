import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotifyUserAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { ChatService } from '../../chat/services/chat.service';
import { assistantOwnerPromptWithInstructions } from '../../ai/agent-prompts/assistant-owner';

@Injectable()
export class NotifyUserActionService {
  private readonly logger = new Logger(NotifyUserActionService.name);

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
    action: NotifyUserAction,
    context: {
      companyId: string;
      instanceName: string;
      contactId: string;
    },
  ): Promise<ActionExecutionResult> {
    const { message, context: actionContext } = action.payload;

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

      await this.notifyUser(
        userToNotify,
        contact,
        context.instanceName,
        message,
        context.companyId,
        actionContext,
      );

      this.logger.log(
        `Notified ${userToNotify.name} about message from ${contact.name}`,
      );

      return {
        success: true,
        action,
        message: 'User notified successfully',
        data: {
          contactId: contact.id,
          contactName: contact.name,
          notifiedUserId: userToNotify.id,
          notifiedUserName: userToNotify.name,
        },
      };
    } catch (error) {
      this.logger.error('Error notifying user:', error);
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

  private async notifyUser(
    user: User,
    contact: Contact,
    instanceName: string,
    clientMessage: string,
    companyId: string,
    actionContext?: string,
  ): Promise<void> {
    const notificationContext = `📬 ${contact.name} respondeu:

"${clientMessage}"
${actionContext ? `\nContexto: ${actionContext}` : ''}`;

    const instructions = `O cliente ${contact.name} enviou uma mensagem que requer atenção.

${notificationContext}

Comunique isso ao proprietário de forma clara e profissional, resumindo a mensagem do cliente.`;

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const systemPrompt = assistantOwnerPromptWithInstructions(
      user,
      instructions,
      company.description,
    );

    const notificationMessage = await this.chatService.buildAIResponse({
      sessionId: user.id,
      message: notificationContext,
      systemPrompt,
    });

    if (!user.phone) {
      this.logger.warn(`User ${user.id} has no phone to receive notification`);
      return;
    }

    const userRemoteJid = this.buildRemoteJid(user.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: user.id,
      companyId: '',
      instanceName,
      remoteJid: userRemoteJid,
      message: notificationMessage,
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
