import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { AgentState } from '../agents/agent.state';

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
    state: typeof AgentState.State,
  ): Promise<string> {
    const { query } = args;
    const { companyId } = state.context;

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

    const result = {
      success: true,
      count: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        instagram: c.instagram,
        companyId: c.companyId,
        preferredUserId: c.preferredUserId,
        ignoreUntil: c.ignoreUntil,
      })),
    };

    return JSON.stringify(result, null, 2);
  }
}
