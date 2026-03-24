import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AgentState } from '../agents/agent.state';
import { PostgresStore } from '../stores/postgres.store';

const updateMemorySchema = z.object({
  type: z
    .enum(['company', 'contact', 'user'])
    .describe(
      'Tipo da memória: company (empresa), contact (contato) ou user (usuário)',
    ),
  content: z
    .string()
    .describe(
      'Conteúdo textual da memória a ser registrada para contexto futuro',
    ),
});

@Injectable()
export class UpdateMemoryTool extends StructuredTool {
  private readonly logger = new Logger(UpdateMemoryTool.name);

  name = 'updateMemory';
  description =
    'Atualiza o histórico de memórias de contexto da empresa, contato ou usuário, registrando informações importantes para uso futuro.';
  schema = updateMemorySchema;

  constructor(private readonly store: PostgresStore) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateMemorySchema>,
    _,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { type, content } = args;
    const context = state.context;
    const { companyId } = context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    let namespace: string[] = ['company', companyId];
    let contactId: string | undefined;
    let userId: string | undefined;

    if (type === 'contact') {
      if ('contactId' in context && context.contactId) {
        contactId = context.contactId;
        namespace = ['company', companyId, 'contact', contactId];
      } else {
        throw new Error(
          'Contact ID missing in the context for contact memory updates',
        );
      }
    } else if (type === 'user') {
      if ('userId' in context && context.userId) {
        userId = context.userId;
        namespace = ['company', companyId, 'user', userId];
      } else {
        throw new Error(
          'User ID missing in the context for user memory updates',
        );
      }
    }

    const key = new Date().toISOString();

    await this.store.put(namespace, key, {
      type,
      companyId,
      contactId,
      userId,
      content,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(
      `✅ [TOOL] Memory stored in LangGraph store for type=${type} companyId=${companyId} contactId=${contactId} userId=${userId}`,
    );

    return `Memória (${type}) registrada com sucesso: ${content}`;
  }
}
