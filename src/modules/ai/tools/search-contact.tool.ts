import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { ToolConfig } from '../types';

const searchContactSchema = z.object({
  query: z
    .string()
    .describe('Nome, telefone ou email do contato a ser buscado'),
});

@Injectable()
export class SearchContactTool extends StructuredTool {
  private readonly logger = new Logger(SearchContactTool.name);

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
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] searchContact called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { query } = args;
    const { companyId } = config.configurable.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.companyId = :companyId', {
        companyId,
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
