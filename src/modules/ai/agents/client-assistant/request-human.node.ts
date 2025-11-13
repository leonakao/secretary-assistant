import { Repository } from 'typeorm';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { ClientAssistantAgentState } from './client-assistant.agent';
import { AIMessage } from '@langchain/core/messages';

export const createRequestHumanNode =
  (contactRepository: Repository<Contact>) =>
  async (state: typeof ClientAssistantAgentState.State) => {
    const { contactId } = state.context;

    const ignoreUntil = new Date();
    ignoreUntil.setHours(ignoreUntil.getHours() + 24);

    await contactRepository.update(
      { id: contactId },
      { ignoreUntil: ignoreUntil },
    );

    return {
      messages: [new AIMessage('Só um momento.')],
    };
  };
