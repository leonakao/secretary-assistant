import { AgentState } from '../agents/agent.state';
import z from 'zod';
import { Command } from '@langchain/langgraph';
import {
  LlmChatModel,
  type LlmModelObservabilityMetadata,
} from '../services/llm-model.service';
import {
  buildLangWatchAttributes,
  langWatchTracer,
} from 'src/observability/langwatch';

export const createDetectTransferNode =
  (model: LlmChatModel, llmMetadata: LlmModelObservabilityMetadata) =>
  async (state: typeof AgentState.State) => {
    const systemMessage = `Você é um analisador de mensagens. Sua única tarefa é determinar se o usuário está solicitando falar com um humano ou suporte humano.

Exemplos de solicitações de humano:
- "Quero falar com um atendente"
- "Preciso de ajuda humana"
- "Pode me transferir para alguém?"
- "Quero falar com uma pessoa"
- "Me passa para um humano"
- "Preciso de suporte"

Xingamentos e ofensas também devem ser considerados como solicitação de suporte humano.

Somente direcione para o humano se você tiver certeza que o agente não vai conseguir auxiliar o usuário. Caso o usuário só esteja com dúvidas, o agente deve continuar interagindo e auxiliando o usuário.
`;

    const lastThreeMessages = state.messages.slice(-3);

    if (lastThreeMessages.length === 0) {
      return new Command({
        goto: 'assistant',
      });
    }

    const messages = [
      { role: 'system', content: systemMessage },
      ...lastThreeMessages.map((msg) => ({
        role: msg.type === 'human' ? ('user' as const) : ('assistant' as const),
        content: msg.content as string,
      })),
    ];

    const modelWithStructuredOutput = model.withStructuredOutput(
      z.object({
        needsHumanSupport: z.boolean(),
        reason: z.string().describe('Breve explicação da decisão'),
      }),
    );

    const context = state.context;
    const response = await langWatchTracer.withActiveSpan(
      'agent.detect_transfer',
      async (span) => {
        span
          .setType('llm')
          .setRequestModel(llmMetadata.ls_model_name)
          .setInput('chat_messages', messages)
          .setAttributes(
            buildLangWatchAttributes({
              companyId: context.companyId,
              contactId: context.contactId,
              instanceName: context.instanceName,
              operation: 'detect_transfer_node',
              userId: context.userId,
            }),
          );

        const response = await modelWithStructuredOutput.invoke(messages);

        span
          .setResponseModel(llmMetadata.ls_model_name)
          .setOutput(
            'text',
            response.needsHumanSupport
              ? `Encaminhar para humano. Motivo: ${response.reason}`
              : `Continuar com o agente. Motivo: ${response.reason}`,
          );

        return response;
      },
    );

    const needsHumanSupport = response.needsHumanSupport;

    if (needsHumanSupport) {
      console.log('Transfer request detected:', response.reason);

      return new Command({
        goto: 'requestHuman',
      });
    }

    return new Command({
      goto: 'assistant',
    });
  };
