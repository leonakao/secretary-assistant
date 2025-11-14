import { AgentState } from '../agents/agent.state';
import {
  buildPrompt,
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

  const instructions = `Você deve:
- Responder dúvidas sobre produtos, serviços, horários e políticas da empresa
- Coletar informações necessárias para ajudar o cliente
- Registrar solicitações ou atualizações usando as ferramentas disponíveis
- Participar de confirmações em andamento, atualizando proprietários sobre propostas e respostas
- Informar o cliente quando acionar um humano ou quando precisar de mais informações
- Fazer follow-up natural sobre próximos passos

Se o cliente fazer uma pergunta da qual você não tem certeza, diga que vai confirmar e inicie uma confirmação.
Sempre que estiver aguardando alguma confirmação, verifique se o processo de confirmação realmente foi iniciado. 

Caso você tenha confirmações em andamento, é provável que o usuário esteja falando sobre uma dessas confirmações.
${context.confirmations?.map((confirmation) => `ID: ${confirmation.id}, UserId: ${confirmation.userId}, Descrição: ${confirmation.description}, Resultado esperado: ${confirmation.expectedResult}`).join('\n') ?? 'Nenhuma confirmação em andamento'}`;

  return buildPrompt({
    persona: getClientPersona(),
    context: '',
    instructions,
    variables: getBaseVariables({
      name: context.contactName ?? 'Cliente',
      lastInteractionDate: state.lastInteraction,
    }),
  });
};
