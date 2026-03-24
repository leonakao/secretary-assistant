import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { AgentState } from '../agents/agent.state';

const searchConversationSchema = z.object({
  contactName: z
    .string()
    .optional()
    .describe('Nome do contato para buscar conversas'),
  contactPhone: z.string().optional().describe('Telefone do contato'),
  query: z
    .string()
    .optional()
    .describe(
      'Termo ou assunto a ser buscado nas conversas. Se não fornecido, retorna todas as conversas recentes do contato.',
    ),
  days: z
    .number()
    .optional()
    .describe('Número de dias para buscar no histórico (padrão: 3)'),
});

@Injectable()
export class SearchConversationTool extends StructuredTool {
  private readonly logger = new Logger(SearchConversationTool.name);

  name = 'searchConversation';
  description =
    'Busca em conversas anteriores com clientes. Use para encontrar informações específicas mencionadas em conversas passadas ou para ver todas as conversas recentes de um contato.';
  schema = searchConversationSchema;

  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchConversationSchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { contactName, contactPhone, query, days = 3 } = args;
    const { companyId } = state.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    let sessionId: string | undefined;

    // Find contact if name or phone provided
    if (contactName || contactPhone) {
      const contacts = await this.contactRepository.find({
        where: { companyId },
      });

      const matchingContacts = contacts.filter(
        (c) =>
          (contactName &&
            c.name.toLowerCase().includes(contactName.toLowerCase())) ||
          (contactPhone && c.phone?.includes(contactPhone)),
      );

      if (matchingContacts.length === 0) {
        const result = {
          success: false,
          error: 'Contact not found',
          message: `Nenhum contato encontrado com "${contactName || contactPhone}"`,
        };
        return JSON.stringify(result, null, 2);
      }

      if (matchingContacts.length > 1) {
        const names = matchingContacts.map((c) => c.name).join(', ');
        const result = {
          success: false,
          error: 'Multiple contacts found',
          message: `Múltiplos contatos encontrados: ${names}. Por favor, especifique melhor.`,
        };
        return JSON.stringify(result, null, 2);
      }

      sessionId = matchingContacts[0].id;
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const queryBuilder = this.memoryRepository
      .createQueryBuilder('memory')
      .where('memory.createdAt > :daysAgo', { daysAgo })
      .orderBy('memory.createdAt', 'DESC')
      .take(10);

    if (sessionId) {
      queryBuilder.andWhere('memory.sessionId = :sessionId', { sessionId });
    }

    if (query) {
      queryBuilder.andWhere('LOWER(memory.content) LIKE LOWER(:query)', {
        query: `%${query}%`,
      });
    }

    const memories = await queryBuilder.getMany();

    return (
      `${memories.length} Conversas encontradas: \n` +
      memories
        .map(
          (memory) =>
            `role: ${memory.role} | content: ${memory.content} | createdAt: ${Intl.DateTimeFormat('pt-BR').format(memory.createdAt)}`,
        )
        .join('\n')
    );
  }
}
