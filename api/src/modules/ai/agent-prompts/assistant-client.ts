import { AgentState } from '../agents/agent.state';
import {
  buildPrompt,
  getBaseMemory,
  getBaseRules,
  getBaseSystem,
  getBaseTools,
  getClientPersona,
  getBaseVariables,
} from './prompt-builder';

/**
 * Standard prompt for client interactions, built from AgentState
 */
export const buildClientPromptFromState = (
  state: typeof AgentState.State,
): string => {
  const { context } = state;
  const confirmationsSummary =
    context.confirmations.length > 0
      ? context.confirmations
          .map(
            (confirmation) =>
              `- ID: ${confirmation.id} | UserId: ${confirmation.userId} | Descrição: ${confirmation.description} | Resultado esperado: ${confirmation.expectedResult}`,
          )
          .join('\n')
      : '- Nenhuma confirmação em andamento';

  return buildPrompt({
    role: getClientPersona(),
    objective: `Você atende clientes em nome da empresa.
- Responda dúvidas sobre produtos, serviços, horários e políticas
- Colete as informações necessárias para ajudar o cliente
- Registre solicitações ou atualizações usando as ferramentas disponíveis
- Faça follow-up natural sobre próximos passos`,
    businessContext:
      context.companyDescription?.trim() ||
      'Use apenas as informações conhecidas da empresa. Não invente produtos, serviços ou políticas.',
    conversationState: `${getBaseVariables({
      name: context.contactName ?? 'Cliente',
      lastInteractionDate: state.lastInteraction,
    })}\n- Confirmações ativas:\n${confirmationsSummary}`,
    responseGuidelines: `${getBaseSystem()}\n\n${getBaseRules()}`,
    toolUsage: `${getBaseTools()}\n\n${getBaseMemory()}`,
    agentSpecificRules: `- Caso o cliente pergunte algo de que você não tem certeza, diga que vai confirmar e inicie uma confirmação.
- Sempre que houver confirmações em andamento, considere que o cliente pode estar respondendo a uma delas.
- Mantenha a conversa alinhada aos produtos, serviços e capacidade operacional da empresa.
- Se o pedido estiver fora do escopo da empresa, diga claramente que a empresa não consegue ajudar com esse assunto e, quando fizer sentido, redirecione para o que a empresa realmente oferece.
- Se o contexto da empresa for insuficiente para decidir se algo está no escopo, não invente. Faça no máximo uma pergunta de clarificação ou diga que você não consegue confirmar essa oferta no momento.`,
  });
};
