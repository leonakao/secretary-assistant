import { Repository } from 'typeorm';
import {
  Mediation,
  MediationStatus,
} from 'src/modules/service-requests/entities/mediation.entity';
import {
  AgentState,
  isClientAgentContext,
  isOwnerAgentContext,
} from '../agents/agent.state';

export const createLoadMediationsNode = (
  mediationRepository: Repository<Mediation>,
) => {
  return async (state: typeof AgentState.State) => {
    const companyId = state.context.companyId;

    let contactId: string | undefined;
    let userId: string | undefined;
    if (isClientAgentContext(state.context)) {
      contactId = state.context.contactId;
    }

    if (isOwnerAgentContext(state.context)) {
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
