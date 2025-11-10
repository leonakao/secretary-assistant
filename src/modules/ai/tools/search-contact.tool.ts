import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';

const searchContactSchema = z.object({
  query: z
    .string()
    .describe('Nome, telefone ou email do contato a ser buscado'),
});

@Injectable()
export class SearchContactTool extends StructuredTool {
  name = 'searchContact';
  description =
    'Busca informações de contatos (clientes). Use para encontrar dados de contato, telefone, email, etc.';
  schema = searchContactSchema;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchContactSchema>,
    _,
    config,
  ): Promise<string> {
    const { query } = args;

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.companyId = :companyId', {
        companyId: config.context.companyId,
      })
      .andWhere(
        '(LOWER(contact.name) LIKE LOWER(:query) OR contact.phone LIKE :query OR LOWER(contact.email) LIKE LOWER(:query))',
        { query: `%${query}%` },
      )
      .take(10)
      .getMany();

    if (contacts.length === 0) {
      return `Nenhum contato encontrado com "${query}".`;
    }

    const results = contacts
      .map((c) => {
        const phone = c.phone ? ` - Tel: ${c.phone}` : '';
        const email = c.email ? ` - Email: ${c.email}` : '';
        return `- ${c.name}${phone}${email}`;
      })
      .join('\n');

    return `Encontrei ${contacts.length} contato(s):\n${results}`;
  }
}
