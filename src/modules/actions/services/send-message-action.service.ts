import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendMessageAction } from '../types/action.types';
import { ActionExecutionResult } from './action-executor.service';
import { Contact } from '../../contacts/entities/contact.entity';
import { Company } from '../../companies/entities/company.entity';
import type { MessageProvider } from '../../chat/interfaces/message-provider.interface';
import { User } from 'src/modules/users/entities/user.entity';
import { ChatService } from '../../chat/services/chat.service';
import { assistantClientPromptWithInstructions } from '../../ai/agent-prompts/assistant-client';
import { assistantOwnerPromptWithInstructions } from '../../ai/agent-prompts/assistant-owner';
import { RecipientFinderService } from './recipient-finder.service';

@Injectable()
export class SendMessageActionService {
  private readonly logger = new Logger(SendMessageActionService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @Inject('MESSAGE_PROVIDER')
    private messageProvider: MessageProvider,
    private chatService: ChatService,
    private recipientFinderService: RecipientFinderService,
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
      const result = await this.recipientFinderService.findRecipient(
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
            context.companyId,
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
          context.companyId,
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
          context.companyId,
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
        type ?? 'contact',
        message,
        context.companyId,
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
        context.companyId,
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

  private async buildContextualMessage(
    recipient: Contact | User,
    recipientType: 'contact' | 'user',
    ownerMessage: string,
    companyId: string,
  ): Promise<string> {
    const recipientLabel = recipientType === 'user' ? 'funcionário' : 'cliente';

    const customInstructions = `O proprietário da empresa pediu para você enviar a seguinte mensagem ao ${recipientLabel}:
"${ownerMessage}"

Reescreva esta mensagem de forma natural e contextual, considerando o histórico da conversa com ${recipientType === 'user' ? 'esse funcionário' : 'o cliente'}.
Se não houver histórico, envie a mensagem de forma direta mas cordial. Não precisa informar que alguém pediu para enviar essa mensagem.

Importante: Se você já tiver enviado uma mensagem para essa pessoa, não diga nada.`;

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const systemPrompt = assistantClientPromptWithInstructions(
      recipient as Contact,
      customInstructions,
      company.description,
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
    companyId: string,
  ): Promise<string> {
    const owner = await this.userRepository.findOneByOrFail({ id: userId });

    const instructions = `Houve um problema ao tentar executar a ação solicitada:

${errorContext}

Comunique isso ao proprietário de forma natural e profissional, mantendo seu tom de secretaria eficiente.`;

    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const systemPrompt = assistantOwnerPromptWithInstructions(
      owner,
      instructions,
      company.description,
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
