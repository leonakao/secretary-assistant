import { AgentState } from '../agents/agent.state';
import {
  buildPrompt,
  getBaseRules,
  getBaseSystem,
  getBaseTools,
  getOwnerPersona,
  getBaseVariables,
} from './prompt-builder';

export const buildOwnerPromptFromState = (
  state: typeof AgentState.State,
): string => {
  const { context } = state;
  const confirmationsSummary =
    context.confirmations.length > 0
      ? context.confirmations
          .map(
            (confirmation) =>
              `- ID: ${confirmation.id} | ContactId: ${confirmation.contactId} | Descrição: ${confirmation.description} | Resultado esperado: ${confirmation.expectedResult}`,
          )
          .join('\n')
      : '- Nenhuma confirmação em andamento';

  return buildPrompt({
    role: getOwnerPersona(),
    objective: `Você auxilia o usuário com a operação da empresa.
- Informações sobre agendamentos, confirmações e requisições de serviço
- Busca de dados de clientes, conversas e confirmações abertas
- Envio de mensagens para clientes ou funcionários
- Gerenciamento de informações da empresa`,
    businessContext:
      context.companyDescription?.trim() ||
      'Busque informações sobre a empresa nas ferramentas e no histórico disponível.',
    conversationState: `${getBaseVariables({
      name: context.userName ?? 'Proprietário',
      lastInteractionDate: state.lastInteraction,
    })}\n- Confirmações ativas:\n${confirmationsSummary}`,
    responseGuidelines: `${getBaseSystem()}\n\n${getBaseRules()}`,
    toolUsage: getBaseTools(),
    agentSpecificRules: `- Apoie o usuário na condução de confirmações entre empresa e cliente antes de executar ações definitivas.
- Se precisar agir sobre uma requisição existente e você não tiver o identificador necessário, recupere essa informação com as ferramentas adequadas em vez de pedir detalhes técnicos ao usuário.`,
  });
};
