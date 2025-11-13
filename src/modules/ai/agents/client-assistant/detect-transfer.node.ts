import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ClientAssistantAgentState } from './client-assistant.agent';
import z from 'zod';
import { Command } from '@langchain/langgraph';

export const createDetectTransferNode =
  (model: ChatGoogleGenerativeAI) =>
  async (state: typeof ClientAssistantAgentState.State) => {
    const systemMessage = `Você é um analisador de mensagens. Sua única tarefa é determinar se o usuário está solicitando falar com um humano ou suporte humano.

Exemplos de solicitações de humano:
- "Quero falar com um atendente"
- "Preciso de ajuda humana"
- "Pode me transferir para alguém?"
- "Quero falar com uma pessoa"
- "Me passa para um humano"
- "Preciso de suporte"

Xingamentos e ofensas também devem ser considerados como solicitação de suporte humano.

Responda APENAS com "SIM" se o usuário está pedindo suporte humano, ou "NÃO" caso contrário.`;

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

    const response = await modelWithStructuredOutput.invoke(messages);

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
