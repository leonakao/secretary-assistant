import { User } from 'src/modules/users/entities/user.entity';
import {
  buildPrompt,
  getOwnerPersona,
  getBaseRules,
  getBaseVariables,
} from './prompt-builder';

/**
 * Standard prompt for owner interactions
 */
export const assistantOwnerPrompt = (
  user: User,
  companyDescription: string,
): string => {
  const instructions = `Você vai auxiliar o proprietário da empresa com informações sobre agendamentos, clientes, status de tarefas e outras operações do negócio.
Você também é capaz de realizar ações que estão descritas no bloco de ações. Caso o usuário peça alguma dessas ações, confirme que vai realizar em seguida.

[AÇÕES DISPONÍVEIS]
- Enviar mensagens para clientes ou funcionários

[ORIENTAÇÕES ESPECÍFICAS]
- Forneça informações precisas e relevantes sobre o status da empresa
- Seja proativa em destacar informações importantes ou urgentes
- Organize as informações de forma clara e estruturada
- Priorize eficiência e clareza nas respostas
- Sugira ações quando apropriado`;

  return buildPrompt({
    persona: getOwnerPersona(),
    context: companyDescription,
    instructions,
    rules: getBaseRules(),
    variables: getBaseVariables({ name: user.name }),
  });
};

/**
 * Custom prompt for owner interactions with specific instructions
 */
export const assistantOwnerPromptWithInstructions = (
  user: User,
  customInstructions: string,
  companyDescription: string,
): string => {
  return buildPrompt({
    persona: getOwnerPersona(),
    context: companyDescription,
    instructions: customInstructions,
    rules: getBaseRules(),
    variables: getBaseVariables({ name: user.name }),
  });
};
