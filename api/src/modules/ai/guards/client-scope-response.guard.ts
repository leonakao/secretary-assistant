import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { AgentState } from '../agents/agent.state';
import {
  LlmChatModel,
  LlmModelObservabilityMetadata,
} from '../services/llm-model.service';
import { createLangWatchRunnableConfig } from 'src/observability/langwatch';
import { resolveThreadId } from '../utils/resolve-thread-id';

const clientScopeGuardSchema = z.object({
  allow: z.boolean(),
  correctedReply: z.string().optional(),
  reason: z.string(),
});

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => normalizeContent(item))
      .filter((item) => item.length > 0)
      .join('\n')
      .trim();
  }

  if (content && typeof content === 'object') {
    if ('text' in content && typeof content.text === 'string') {
      return content.text.trim();
    }

    if ('content' in content) {
      return normalizeContent(content.content);
    }
  }

  return '';
}

export const createClientScopeResponseGuard =
  (helperModel: LlmChatModel, llmMetadata: LlmModelObservabilityMetadata) =>
  async (params: {
    config?: RunnableConfig;
    response: AIMessage;
    state: typeof AgentState.State;
  }): Promise<AIMessage> => {
    const { response, state, config } = params;
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length > 0) {
      return response;
    }

    const companyDescription = state.context.companyDescription?.trim();
    if (!companyDescription) {
      return response;
    }

    const assistantReply = normalizeContent(response.content);
    if (!assistantReply) {
      return response;
    }

    const latestHumanMessage = [...state.messages]
      .reverse()
      .find((message) => message.type === 'human');
    const latestUserMessage = normalizeContent(latestHumanMessage?.content);

    if (!latestUserMessage) {
      return response;
    }

    const modelWithStructuredOutput = helperModel.withStructuredOutput(
      clientScopeGuardSchema,
    );
    const threadId = resolveThreadId(config, state.context);

    try {
      const result = await modelWithStructuredOutput.invoke(
        [
          {
            role: 'system',
            content: `Você valida se a resposta de uma secretária virtual está alinhada ao escopo real da empresa.

Regras:
- Use a descrição da empresa como fonte de verdade.
- Só bloqueie quando a resposta afirmar, sugerir fortemente ou tratar como disponível algo que não está sustentado pela descrição da empresa.
- Se a resposta estiver fora do escopo, gere uma resposta corrigida em português, natural e curta.
- A resposta corrigida deve recusar o pedido fora do escopo e, quando fizer sentido, redirecionar para o que a empresa realmente oferece.
- Se a descrição da empresa não for suficiente para concluir que a resposta está fora do escopo, permita a resposta.
- Não invente novos produtos, serviços ou capacidades.`,
          },
          {
            role: 'user',
            content: `Descrição da empresa:
${companyDescription}

Mensagem do cliente:
${latestUserMessage}

Resposta candidata da assistente:
${assistantReply}`,
          },
        ],
        createLangWatchRunnableConfig(config, {
          ...llmMetadata,
          companyId: state.context.companyId,
          contactId: state.context.contactId,
          instanceName: state.context.instanceName,
          operation: 'client_scope_response_guard',
          threadId,
          userId: state.context.userId,
        }),
      );

      if (result.allow || !result.correctedReply?.trim()) {
        return response;
      }

      return new AIMessage({
        content: result.correctedReply.trim(),
      });
    } catch {
      return response;
    }
  };
