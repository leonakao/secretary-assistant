import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { AgentState } from '../agents/agent.state';

const createContactSchema = z.object({
  name: z.string().describe('Nome do contato'),
  phone: z
    .string()
    .optional()
    .describe('Telefone do contato. Sempre no formato +5511999999999'),
  email: z.string().optional().describe('Email do contato'),
});

@Injectable()
export class CreateContactTool extends StructuredTool {
  private readonly logger = new Logger(CreateContactTool.name);

  name = 'createContact';
  description =
    'Cria um novo contato (cliente). Use quando o proprietário quiser adicionar um novo cliente ao sistema.';
  schema = createContactSchema;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof createContactSchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { name, phone, email } = args;

    const { companyId } = state.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    if (phone) {
      const existingContact = await this.contactRepository.findOne({
        where: {
          companyId,
          phone,
        },
      });

      if (existingContact) {
        return `Já existe um contato com o telefone ${phone}`;
      }
    }

    const contact = this.contactRepository.create({
      companyId,
      name,
      phone,
      email,
    });

    await this.contactRepository.save(contact);

    return `Contato criado com sucesso: ${contact.id}`;
  }
}
