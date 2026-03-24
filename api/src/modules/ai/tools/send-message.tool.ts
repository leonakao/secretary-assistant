import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ChatService } from 'src/modules/chat/services/chat.service';
import { AgentState } from '../agents/agent.state';

const sendMessageSchema = z.object({
  recipientId: z.string().describe('ID do destinatário (contactId ou userId)'),
  recipientType: z.enum(['contact', 'user']).describe('Tipo do destinatário'),
  message: z.string().describe('Mensagem a ser enviada'),
});

@Injectable()
export class SendMessageTool extends StructuredTool {
  private readonly logger = new Logger(SendMessageTool.name);

  name = 'sendMessage';
  description =
    'Envia uma mensagem para um cliente ou funcionário. Use esta ferramenta quando o proprietário pedir para enviar uma mensagem para alguém OU quando você achar que algum funcionário precisa receber uma mensagem. A mensagem será enviada em seu nome, e não no nome do usuário.';
  schema = sendMessageSchema;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly chatService: ChatService,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof sendMessageSchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { recipientId, recipientType, message } = args;
    const { companyId, instanceName } = state.context;

    if (!companyId || !instanceName) {
      throw new Error(
        'Context missing required fields: companyId, instanceName',
      );
    }

    const recipient =
      recipientType === 'contact'
        ? await this.findContactRecipient(recipientId, companyId)
        : await this.findUserRecipient(recipientId);

    if (!recipient) {
      return `${recipientType === 'user' ? 'O usuário' : 'O contato'} "${recipientId}" não encontrado`;
    }

    if (!recipient.phone) {
      return `${recipientType === 'user' ? 'O usuário' : 'O contato'} "${recipient?.name}" não possui telefone cadastrado`;
    }

    const remoteJid = this.buildRemoteJid(recipient.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: recipient.id,
      companyId,
      instanceName,
      remoteJid,
      message,
    });

    return 'Mensagem enviada com sucesso';
  }

  private async findContactRecipient(recipientId: string, companyId: string) {
    const contact = await this.contactRepository.findOne({
      where: { id: recipientId, companyId },
    });

    if (!contact) {
      return null;
    }

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    };
  }

  private async findUserRecipient(recipientId: string) {
    const user = await this.userRepository.findOne({
      where: { id: recipientId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
    };
  }

  private buildRemoteJid(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;
    return `${phoneWithoutPlus}@s.whatsapp.net`;
  }
}
