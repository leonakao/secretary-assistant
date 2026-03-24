import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentState } from '../agents/agent.state';
import { PostgresStore } from '../stores/postgres.store';

const searchMemorySchema = z.object({
  type: z
    .enum(['company', 'contact', 'user'])
    .describe(
      'Tipo da memória: company (empresa), contact (contato) ou user (usuário)',
    ),
  query: z.string().describe('Termo a ser buscado no conteúdo das memórias'),
});

@Injectable()
export class SearchMemoryTool extends StructuredTool {
  private readonly logger = new Logger(SearchMemoryTool.name);

  name = 'searchMemory';
  description =
    'Busca informações previamente salvas na memória de contexto (empresa, contato ou usuário) com base em um termo de pesquisa.';
  schema = searchMemorySchema;

  constructor(private readonly store: PostgresStore) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchMemorySchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { type, query } = args;
    const context = state.context;
    const { companyId } = context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    let namespacePrefix: string[] = ['company', companyId];
    let contactId: string | undefined;
    let userId: string | undefined;

    if (type === 'contact') {
      if ('contactId' in context && context.contactId) {
        contactId = context.contactId;
        namespacePrefix = ['company', companyId, 'contact', contactId];
      } else {
        throw new Error(
          'Contact ID missing in the context for contact memory search',
        );
      }
    } else if (type === 'user') {
      if ('userId' in context && context.userId) {
        userId = context.userId;
        namespacePrefix = ['company', companyId, 'user', userId];
      } else {
        throw new Error(
          'User ID missing in the context for user memory search',
        );
      }
    }

    const results = await this.store.search(namespacePrefix, {
      query,
      limit: 10,
    });

    if (results.length === 0) {
      return `Nenhuma memória encontrada para o tipo "${type}" com o termo "${query}".`;
    }

    return (
      `${results.length} Memórias encontradas: \n` +
      results
        .map((item) => {
          const createdAt = item.createdAt ?? new Date(item.value?.createdAt);
          return `conteúdo: ${item.value?.content} | criadoEm: ${createdAt ? Intl.DateTimeFormat('pt-BR').format(createdAt) : 'desconhecido'}`;
        })
        .join('\n')
    );
  }
}
