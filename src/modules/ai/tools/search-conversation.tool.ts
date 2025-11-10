import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { ToolConfig } from '../types';

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
    runManager,
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] searchConversation called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { contactName, contactPhone, query, days = 3 } = args;
    const { companyId } = config.configurable.context;

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
        return `Contato "${contactName || contactPhone}" não encontrado.`;
      }

      if (matchingContacts.length > 1) {
        const names = matchingContacts.map((c) => c.name).join(', ');
        return `Múltiplos contatos encontrados: ${names}. Por favor, especifique melhor.`;
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

    if (memories.length === 0) {
      const searchDesc = query
        ? `com o termo "${query}"`
        : sessionId
          ? 'para este contato'
          : '';
      return `Nenhuma conversa encontrada ${searchDesc} nos últimos ${days} dias.`;
    }

    const results = memories
      .reverse()
      .map((m) => {
        const date = m.createdAt.toLocaleDateString('pt-BR');
        const role = m.role === 'user' ? 'Cliente' : 'Assistente';
        return `[${date}] ${role}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');

    const searchInfo = query ? ` com o termo "${query}"` : '';
    return `Encontradas ${memories.length} mensagens${searchInfo}:\n\n${results}`;
  }
}
