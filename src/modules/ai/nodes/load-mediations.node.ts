import { Repository } from 'typeorm';
import { ClientAssistantAgentState } from '../agents/client-assistant/client-assistant.agent';
import { OwnerAssistantAgentState } from '../agents/owner-assistant/owner-assistant.agent';
import {
  Mediation,
  MediationStatus,
} from 'src/modules/service-requests/entities/mediation.entity';

export const createLoadMediationsNode = (
  mediationRepository: Repository<Mediation>,
) => {
  return async (
    state:
      | typeof ClientAssistantAgentState.State
      | typeof OwnerAssistantAgentState.State,
  ) => {
    const companyId = state.context.companyId;

    let contactId;
    let userId;
    if (isClientAssistantState(state)) {
      contactId = state.context.contactId;
    } else {
      userId = state.context.userId;
    }

    const mediations = await mediationRepository.find({
      where: {
        companyId,
        status: MediationStatus.ACTIVE,
        contactId,
        userId,
      },
    });

    return {
      context: {
        ...state.context,
        mediations,
      },
    };
  };
};

const isClientAssistantState = (
  state: any,
): state is typeof ClientAssistantAgentState.State => {
  return state.context.contactId !== undefined;
};
