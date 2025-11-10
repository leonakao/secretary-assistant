import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Memory } from 'src/modules/chat/entities/memory.entity';
import { Contact } from 'src/modules/contacts/entities/contact.entity';

const searchConversationSchema = z.object({
  contactName: z
    .string()
    .optional()
    .describe('Nome do contato para buscar conversas'),
  contactPhone: z.string().optional().describe('Telefone do contato'),
  query: z.string().describe('Termo ou assunto a ser buscado nas conversas'),
  days: z
    .number()
    .optional()
    .describe('Número de dias para buscar no histórico (padrão: 30)'),
});

@Injectable()
export class SearchConversationTool extends StructuredTool {
  name = 'searchConversation';
  description =
    'Busca em conversas anteriores com clientes. Use para encontrar informações específicas mencionadas em conversas passadas.';
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
    config,
  ): Promise<string> {
    const { contactName, contactPhone, query, days = 30 } = args;

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    let sessionId: string | undefined;

    // Find contact if name or phone provided
    if (contactName || contactPhone) {
      const contacts = await this.contactRepository.find({
        where: { companyId: config.context.companyId },
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
      .andWhere('LOWER(memory.content) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orderBy('memory.createdAt', 'DESC')
      .take(10);

    if (sessionId) {
      queryBuilder.andWhere('memory.sessionId = :sessionId', { sessionId });
    }

    const memories = await queryBuilder.getMany();

    if (memories.length === 0) {
      return `Nenhuma conversa encontrada com o termo "${query}" nos últimos ${days} dias.`;
    }

    const results = memories
      .map((m) => {
        const date = m.createdAt.toLocaleDateString('pt-BR');
        const role = m.role === 'user' ? 'Cliente' : 'Assistente';
        return `[${date}] ${role}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');

    return `Encontrei ${memories.length} mensagem(ns) relacionada(s):\n\n${results}`;
  }
}
