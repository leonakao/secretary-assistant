import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

import { PendingConfirmation } from 'src/modules/service-requests/services/find-pending-confirmations.service';

export interface BaseAgentContext {
  companyId: string;
  instanceName: string;
  companyDescription: string;
  confirmations: PendingConfirmation[];
}

export interface ClientAgentContext extends BaseAgentContext {
  contactId: string;
  contactName: string;
  contactPhone?: string;
}

export interface OwnerAgentContext extends BaseAgentContext {
  userId: string;
  userName: string;
  userPhone?: string;
}

export type AgentContext = ClientAgentContext | OwnerAgentContext;

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<AgentContext>(),
  needsHumanSupport: Annotation<boolean>({
    reducer: (_, newValue) => newValue ?? false,
    default: () => false,
  }),
  lastInteraction: Annotation<Date>({
    reducer: (_, newValue) => newValue ?? new Date(),
    default: () => new Date(),
  }),
});

export const isClientAgentContext = (
  context: AgentContext,
): context is ClientAgentContext => {
  return (context as ClientAgentContext).contactId !== undefined;
};

export const isOwnerAgentContext = (
  context: AgentContext,
): context is OwnerAgentContext => {
  return (context as OwnerAgentContext).userId !== undefined;
};
