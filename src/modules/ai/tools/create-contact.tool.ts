import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';

const createContactSchema = z.object({
  name: z.string().describe('Nome do contato'),
  phone: z.string().optional().describe('Telefone do contato'),
  email: z.string().optional().describe('Email do contato'),
});

@Injectable()
export class CreateContactTool extends StructuredTool {
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
    config,
  ): Promise<string> {
    const { name, phone, email } = args;

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    // Check if contact already exists
    if (phone) {
      const existingContact = await this.contactRepository.findOne({
        where: {
          companyId: config.context.companyId,
          phone,
        },
      });

      if (existingContact) {
        return `Já existe um contato com o telefone ${phone}: ${existingContact.name}`;
      }
    }

    const contact = this.contactRepository.create({
      companyId: config.context.companyId,
      name,
      phone,
      email,
    });

    await this.contactRepository.save(contact);

    return `Contato "${name}" criado com sucesso.`;
  }
}
