import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import type { MessageProvider } from 'src/modules/chat/interfaces/message-provider.interface';
import { ChatService } from 'src/modules/chat/services/chat.service';
import { assistantClientPromptWithInstructions } from '../agent-prompts/assistant-client';

const sendMessageSchema = z.object({
  recipientId: z.string().describe('ID do destinatário (contactId ou userId)'),
  message: z.string().describe('Mensagem a ser enviada'),
});

@Injectable()
export class SendMessageTool extends StructuredTool {
  name = 'sendMessage';
  description =
    'Envia uma mensagem para um cliente ou funcionário. Use esta ferramenta quando o proprietário pedir para enviar uma mensagem para alguém.';
  schema = sendMessageSchema;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @Inject('MESSAGE_PROVIDER')
    private readonly messageProvider: MessageProvider,
    private readonly chatService: ChatService,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof sendMessageSchema>,
    _,
    config,
  ): Promise<string> {
    const { recipientId, message } = args;

    if (!config?.context?.companyId || !config?.context?.instanceName) {
      throw new Error(
        'Context missing required fields: companyId, instanceName',
      );
    }

    const { companyId, instanceName } = config.context;

    // Try to find recipient in contacts first
    let recipient: Contact | User | null = await this.contactRepository.findOne(
      {
        where: { id: recipientId, companyId },
      },
    );

    let recipientType: 'contact' | 'user' = 'contact';

    if (!recipient) {
      // Try users
      const user = await this.userRepository.findOne({
        where: { id: recipientId },
      });
      if (user) {
        recipient = user;
        recipientType = 'user';
      }
    }

    if (!recipient) {
      return `Destinatário com ID ${recipientId} não encontrado.`;
    }

    if (!recipient.phone) {
      return `${recipientType === 'user' ? 'O funcionário' : 'O contato'} "${recipient.name}" não possui telefone cadastrado.`;
    }

    const remoteJid = this.buildRemoteJid(recipient.phone);

    // Build contextual message
    const company = await this.companyRepository.findOneByOrFail({
      id: companyId,
    });

    const customInstructions = `O proprietário da empresa pediu para você enviar a seguinte mensagem ao ${recipientType === 'user' ? 'funcionário' : 'cliente'}:
"${message}"

Reescreva esta mensagem de forma natural e contextual, considerando o histórico da conversa.
Se não houver histórico, envie a mensagem de forma direta mas cordial. Não precisa informar que alguém pediu para enviar essa mensagem.`;

    const systemPrompt = assistantClientPromptWithInstructions(
      recipient as Contact,
      customInstructions,
      company.description,
    );

    const contextualMessage = await this.chatService.buildAIResponse({
      sessionId: recipient.id,
      message,
      systemPrompt,
    });

    await this.chatService.sendMessageAndSaveToMemory({
      sessionId: recipient.id,
      companyId,
      instanceName,
      remoteJid,
      message: contextualMessage,
    });

    return `Mensagem enviada com sucesso para ${recipient.name}${recipientType === 'user' ? ' (Funcionário)' : ''}`;
  }

  private buildRemoteJid(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneWithoutPlus = cleanPhone.startsWith('+')
      ? cleanPhone.substring(1)
      : cleanPhone;
    return `${phoneWithoutPlus}@s.whatsapp.net`;
  }
}
