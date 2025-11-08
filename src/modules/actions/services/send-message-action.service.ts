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
    const { contactName, contactPhone, message } = action.payload;

    try {
      const result = await this.findContact(
        context.companyId,
        contactName,
        contactPhone,
      );

      if (!result.contact) {
        if (result.multipleContacts && result.multipleContacts.length > 0) {
          const contactList = result.multipleContacts
            .map(
              (c, index) =>
                `${index + 1}. ${c.name}${c.phone ? ` - ${c.phone}` : ''}`,
            )
            .join('\n');

          const errorMsg = `Encontrei ${result.multipleContacts.length} contatos com o nome "${contactName}":\n\n${contactList}\n\nPor favor, especifique qual contato você deseja enviar a mensagem.`;

          await this.notifyOwner(
            context.companyId,
            context.instanceName,
            context.userId,
            errorMsg,
          );

          return {
            success: false,
            action,
            error: 'Multiple contacts found',
            data: { multipleContacts: result.multipleContacts },
          };
        }

        const errorMsg = `Não consegui encontrar o contato "${contactName}". O nome está correto?`;

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

      const contact = result.contact;

      if (!contact.phone) {
        const errorMsg = `O contato "${contact.name}" não possui telefone cadastrado.`;

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

      const remoteJid = this.buildRemoteJid(contact.phone);

      const contextualMessage = await this.buildContextualMessage(
        contact,
        message,
      );

      await this.chatService.sendMessageAndSaveToMemory({
        sessionId: contact.id,
        companyId: context.companyId,
        instanceName: context.instanceName,
        remoteJid,
        message: contextualMessage,
      });

      await this.notifyOwner(
        context.companyId,
        context.instanceName,
        context.userId,
        `✓ Mensagem enviada para ${contact.name}`,
      );

      return {
        success: true,
        action,
        message: `Message sent to ${contact.name}`,
        data: { contactId: contact.id, contactName: contact.name },
      };
    } catch (error) {
      const errorMsg = `Erro ao enviar mensagem: ${error.message}`;

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

  private async findContact(
    companyId: string,
    contactName: string,
    contactPhone?: string,
  ): Promise<{ contact: Contact | null; multipleContacts?: Contact[] }> {
    if (contactPhone) {
      const contact = await this.contactRepository.findOne({
        where: {
          companyId,
          phone: contactPhone,
        },
      });
      if (contact) return { contact };
    }

    const contacts = await this.contactRepository.find({
      where: {
        companyId,
        name: ILike(`%${contactName}%`),
      },
      take: 10,
    });

    if (contacts.length === 0) {
      return { contact: null };
    }

    if (contacts.length === 1) {
      return { contact: contacts[0] };
    }

    const exactMatch = contacts.find(
      (c) => c.name.toLowerCase() === contactName.toLowerCase(),
    );
    if (exactMatch) {
      return { contact: exactMatch };
    }

    return { contact: null, multipleContacts: contacts };
  }

  private async buildContextualMessage(
    contact: Contact,
    ownerMessage: string,
  ): Promise<string> {
    const customInstructions = `O proprietário da empresa pediu para você enviar a seguinte mensagem ao cliente:
"${ownerMessage}"

Reescreva esta mensagem de forma natural e contextual, considerando o histórico da conversa com o cliente.
Se não houver histórico, envie a mensagem de forma direta mas cordial. Não precisa informar que alguém pediu para enviar essa mensagem.

Importante: Se você já tiver enviado uma mensagem para esse cliente, não diga nada.`;

    const systemPrompt = assistantClientPromptWithInstructions(
      contact,
      customInstructions,
    );

    const contextualMessage = await this.chatService.buildAIResponse({
      sessionId: contact.id,
      message: ownerMessage,
      systemPrompt,
    });

    return contextualMessage;
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
