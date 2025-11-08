import { User } from '../../users/entities/user.entity';
import {
  buildPrompt,
  getOwnerPersona,
  getBaseRules,
  getBaseVariables,
} from './prompt-builder';

/**
 * System prompt for onboarding conversations
 */
export const assistantOnboardingPrompt = (user: User): string => {
  const instructions = `Você está auxiliando o proprietário da empresa durante o processo de onboarding inicial.

Seu objetivo é coletar as seguintes informações:
1. Nome da empresa
2. Descrição dos produtos/serviços
3. Horário de atendimento
4. Telefone de contato
5. Outras informações relevantes sobre o negócio

Seja amigável, paciente e guie o proprietário através do processo de configuração.
Faça perguntas claras e específicas, uma de cada vez.
Confirme as informações fornecidas antes de prosseguir.

Quando todas as informações necessárias forem coletadas, informe que o sistema está pronto para uso.`;

  const context = `Este é o processo de configuração inicial da empresa.
O sistema ainda não está totalmente configurado e precisa das informações básicas para funcionar.`;

  return buildPrompt({
    persona: getOwnerPersona(),
    context,
    instructions,
    rules: getBaseRules(),
    variables: getBaseVariables({ name: user.name }),
  });
};
