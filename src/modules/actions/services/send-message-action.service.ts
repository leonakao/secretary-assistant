import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SendMessageAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import type { MessageProvider } from '../../chat/interfaces/message-provider.interface';
import { User } from 'src/modules/users/entities/user.entity';
import { ChatService } from '../../chat/services/chat.service';
import { assistantClientPromptWithInstructions } from '../../ai/agent-prompts/assistant-client';
import { assistantOwnerPromptWithInstructions } from '../../ai/agent-prompts/assistant-owner';

@Injectable()
export class SendMessageActionService {
  private readonly logger = new Logger(SendMessageActionService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject('MESSAGE_PROVIDER')
    private messageProvider: MessageProvider,
    private chatService: ChatService,
  ) {}

  async execute(
    action: SendMessageAction,
    context: {
      companyId: string;
      instanceName: string;
      userId: string;
    },
  ): Promise<ActionExecutionResult> {
    const { recipientName, recipientPhone, message } = action.payload;

    try {
      const result = await this.findRecipient(
        context.companyId,
        recipientName,
        recipientPhone,
        context.userId,
      );

      if (!result.recipient) {
        if (result.multipleRecipients && result.multipleRecipients.length > 0) {
          const recipientList = result.multipleRecipients
            .map(
              (r, index) =>
                `${index + 1}. ${r.name}${r.phone ? ` - ${r.phone}` : ''} (${r.type === 'user' ? 'Funcionário' : 'Cliente'})`,
            )
            .join('\n');

          const errorMsg = await this.buildErrorMessage(
            context.userId,
            `Encontrei ${result.multipleRecipients.length} pessoas com o nome "${recipientName}":\n\n${recipientList}\n\nInforme qual pessoa você deseja enviar a mensagem.`,
          );

          await this.notifyOwner(
            context.companyId,
            context.instanceName,
            context.userId,
            errorMsg,
          );

          return {
            success: false,
            action,
            error: 'Multiple recipients found',
            data: { multipleRecipients: result.multipleRecipients },
          };
        }

        const errorMsg = await this.buildErrorMessage(
          context.userId,
          `Não consegui encontrar "${recipientName}" nos contatos ou funcionários. Verifique o nome.`,
        );

        await this.notifyOwner(
          context.companyId,
          context.instanceName,
          context.userId,
          errorMsg,
        );

        return {
          success: false,
          action,
          error: errorMsg,
        };
      }

      const { recipient, type } = result;

      if (!recipient.phone) {
        const errorMsg = await this.buildErrorMessage(
          context.userId,
          `${type === 'user' ? 'O funcionário' : 'O contato'} "${recipient.name}" não possui telefone cadastrado.`,
        );

        await this.notifyOwner(
          context.companyId,
          context.instanceName,
          context.userId,
          errorMsg,
        );

        return {
          success: false,
          action,
          error: errorMsg,
        };
      }

      const remoteJid = this.buildRemoteJid(recipient.phone);

      const contextualMessage = await this.buildContextualMessage(
        recipient,
        type,
        message,
      );

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: recipient.id,
        companyId: context.companyId,
        instanceName: context.instanceName,
        remoteJid,
        message: contextualMessage,
      });

      await this.notifyOwner(
        context.companyId,
        context.instanceName,
        context.userId,
        `✓ Mensagem enviada para ${recipient.name}${type === 'user' ? ' (Funcionário)' : ''}`,
      );

      return {
        success: true,
        action,
        message: `Message sent to ${recipient.name}`,
        data: {
          recipientId: recipient.id,
          recipientName: recipient.name,
          recipientType: type,
        },
      };
    } catch (error) {
      const errorMsg = await this.buildErrorMessage(
        context.userId,
        `Erro ao enviar mensagem: ${error.message}`,
      );

      await this.notifyOwner(
        context.companyId,
        context.instanceName,
        context.userId,
        `✗ ${errorMsg}`,
      );

      return {
        success: false,
        action,
        error: errorMsg,
      };
    }
  }

  private async findRecipient(
    companyId: string,
    recipientName: string,
    recipientPhone: string | undefined,
    excludeUserId: string,
  ): Promise<{
    recipient: Contact | User | null;
    type?: 'contact' | 'user';
    multipleRecipients?: Array<{
      name: string;
      phone: string;
      type: 'contact' | 'user';
    }>;
  }> {
    if (recipientPhone) {
      const contact = await this.contactRepository.findOne({
        where: { companyId, phone: recipientPhone },
      });
      if (contact) return { recipient: contact, type: 'contact' };

      const user = await this.userRepository.findOne({
        where: { phone: recipientPhone },
        relations: ['userCompanies'],
      });
      if (
        user &&
        user.id !== excludeUserId &&
        user.userCompanies?.some((uc) => uc.companyId === companyId)
      ) {
        return { recipient: user, type: 'user' };
      }
    }

    const contacts = await this.contactRepository.find({
      where: { companyId, name: ILike(`%${recipientName}%`) },
      take: 10,
    });

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userCompanies', 'uc')
      .where('uc.companyId = :companyId', { companyId })
      .andWhere('user.id != :excludeUserId', { excludeUserId })
      .andWhere('user.name ILIKE :name', { name: `%${recipientName}%` })
      .take(10)
      .getMany();

    const allRecipients = [
      ...contacts.map((c) => ({ ...c, type: 'contact' as const })),
      ...users.map((u) => ({ ...u, type: 'user' as const })),
    ];

    if (allRecipients.length === 0) {
      return { recipient: null };
    }

    if (allRecipients.length === 1) {
      const { type, ...recipient } = allRecipients[0];
      return { recipient: recipient as Contact | User, type };
    }

    const exactMatch = allRecipients.find(
      (r) => r.name.toLowerCase() === recipientName.toLowerCase(),
    );
    if (exactMatch) {
      const { type, ...recipient } = exactMatch;
      return { recipient: recipient as Contact | User, type };
    }

    return {
      recipient: null,
      multipleRecipients: allRecipients.map((r) => ({
        name: r.name,
        phone: r.phone,
        type: r.type,
      })),
    };
  }

  private async buildContextualMessage(
    recipient: Contact | User,
    recipientType: 'contact' | 'user',
    ownerMessage: string,
  ): Promise<string> {
    const recipientLabel = recipientType === 'user' ? 'funcionário' : 'cliente';

    const customInstructions = `O proprietário da empresa pediu para você enviar a seguinte mensagem ao ${recipientLabel}:
"${ownerMessage}"

Reescreva esta mensagem de forma natural e contextual, considerando o histórico da conversa com ${recipientType === 'user' ? 'esse funcionário' : 'o cliente'}.
Se não houver histórico, envie a mensagem de forma direta mas cordial. Não precisa informar que alguém pediu para enviar essa mensagem.

Importante: Se você já tiver enviado uma mensagem para essa pessoa, não diga nada.`;

    const systemPrompt = assistantClientPromptWithInstructions(
      recipient as Contact,
      customInstructions,
    );

    const contextualMessage = await this.chatService.buildAIResponse({
      sessionId: recipient.id,
      message: ownerMessage,
      systemPrompt,
    });

    return contextualMessage;
  }

  private async buildErrorMessage(
    userId: string,
    errorContext: string,
  ): Promise<string> {
    const owner = await this.userRepository.findOneByOrFail({ id: userId });

    const instructions = `Houve um problema ao tentar executar a ação solicitada:

${errorContext}

Comunique isso ao proprietário de forma natural e profissional, mantendo seu tom de secretaria eficiente.`;

    const systemPrompt = assistantOwnerPromptWithInstructions(
      owner,
      instructions,
    );

    const errorMessage = await this.chatService.buildAIResponse({
      sessionId: userId,
      message: errorContext,
      systemPrompt,
    });

    return errorMessage;
  }

  private buildRemoteJid(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;
    return `${phoneWithoutPlus}@s.whatsapp.net`;
  }

  private async notifyOwner(
    companyId: string,
    instanceName: string,
    userId: string,
    message: string,
  ): Promise<void> {
    const owner = await this.userRepository.findOneByOrFail({
      id: userId,
    });

    const ownerRemoteJid = this.buildRemoteJid(owner.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: userId,
      companyId,
      instanceName,
      remoteJid: ownerRemoteJid,
      message,
    });
  }
}
