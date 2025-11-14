import { AgentState } from '../agents/agent.state';
import {
  buildPrompt,
  getOwnerPersona,
  getBaseVariables,
} from './prompt-builder';

export const buildOwnerPromptFromState = (
  state: typeof AgentState.State,
): string => {
  const { context } = state;

  const instructions = `Você auxilia o usuário com:
- Informações sobre agendamentos, confirmações e requisições de serviço
- Condução de confirmações entre usuário e cliente antes de executar ações definitivas
- Busca de dados de clientes, conversas e confirmações abertas
- Envio de mensagens para clientes ou funcionários
- Gerenciamento de informações da empresa
- Criação e atualização de contatos, confirmações e requisições
- Gerenciar compromissos

`;

  return buildPrompt({
    persona: getOwnerPersona(),
    context: 'Busque informações sobre a empresa na sua memória',
    instructions,
    variables: getBaseVariables({
      name: context.userName ?? 'Proprietário',
      lastInteractionDate: state.lastInteraction,
    }),
  });
};
