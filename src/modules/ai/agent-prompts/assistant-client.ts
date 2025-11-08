import { Contact } from 'src/modules/contacts/entities/contact.entity';
import {
  buildPrompt,
  getClientPersona,
  getCompanyContext,
  getBaseRules,
  getBaseVariables,
} from './prompt-builder';

/**
 * Standard prompt for client interactions
 */
export const assistantClientPrompt = (contact: Contact): string => {
  const instructions = `Você vai atender os clientes e responder perguntas sobre a empresa.
- Sempre termine sua resposta perguntando se o cliente precisa de ajuda com algo mais, exceto quando o cliente terminar sua mensagem com "obrigado" ou "obrigada".`;

  return buildPrompt({
    persona: getClientPersona(),
    context: getCompanyContext(),
    instructions,
    rules: getBaseRules(),
    variables: getBaseVariables({ name: contact.name }),
  });
};

/**
 * Custom prompt for client interactions with specific instructions
 */
export const assistantClientPromptWithInstructions = (
  contact: Contact,
  customInstructions: string,
): string => {
  return buildPrompt({
    persona: getClientPersona(),
    context: getCompanyContext(),
    instructions: customInstructions,
    rules: getBaseRules(),
    variables: getBaseVariables({ name: contact.name }),
  });
};
