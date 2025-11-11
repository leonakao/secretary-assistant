import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ChatService } from 'src/modules/chat/services/chat.service';
import { ToolConfig } from '../types';

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
    config: ToolConfig,
  ): Promise<string> {
    const { recipientId, recipientType, message } = args;
    const { companyId, instanceName } = config.configurable.context;

    if (!companyId || !instanceName) {
      throw new Error(
        'Context missing required fields: companyId, instanceName',
      );
    }

    let recipient: Contact | User | null = null;

    if (recipientType === 'contact') {
      recipient = await this.contactRepository.findOne({
        where: { id: recipientId, companyId },
      });
    }

    if (!recipient && recipientType === 'user') {
      recipient = await this.userRepository.findOne({
        where: { id: recipientId },
      });
    }

    if (!recipient) {
      const result = {
        success: false,
        error: 'Recipient not found',
        message: `Destinatário com ID ${recipientId} não encontrado`,
      };
      return JSON.stringify(result, null, 2);
    }

    if (!recipient.phone) {
      const result = {
        success: false,
        error: 'Phone number missing',
        message: `${recipientType === 'user' ? 'O funcionário' : 'O contato'} "${recipient.name}" não possui telefone cadastrado`,
      };
      return JSON.stringify(result, null, 2);
    }

    const remoteJid = this.buildRemoteJid(recipient.phone);

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: recipient.id,
      companyId,
      instanceName,
      remoteJid,
      message,
    });

    const result = {
      success: true,
      message: 'Mensagem enviada com sucesso',
      recipient: {
        id: recipient.id,
        name: recipient.name,
        type: recipientType,
        phone: 'phone' in recipient ? recipient.phone : undefined,
      },
      sentMessage: message,
    };

    return JSON.stringify(result, null, 2);
  }

  private buildRemoteJid(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;
    return `${phoneWithoutPlus}@s.whatsapp.net`;
  }
}
