import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { ToolConfig } from '../types';

const createContactSchema = z.object({
  name: z.string().describe('Nome do contato'),
  phone: z.string().optional().describe('Telefone do contato'),
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
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] createContact called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { name, phone, email } = args;

    const { companyId } = config.configurable.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    // Check if contact already exists
    if (phone) {
      const existingContact = await this.contactRepository.findOne({
        where: {
          companyId,
          phone,
        },
      });

      if (existingContact) {
        return `Já existe um contato com o telefone ${phone}: ${existingContact.name}`;
      }
    }

    const contact = this.contactRepository.create({
      companyId,
      name,
      phone,
      email,
    });

    await this.contactRepository.save(contact);

    const result = `Contato "${name}" criado com sucesso.`;
    this.logger.log(`✅ [TOOL] ${result}`);
    return result;
  }
}
