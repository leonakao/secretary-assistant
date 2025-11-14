import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

import { PendingConfirmation } from 'src/modules/service-requests/services/find-pending-confirmations.service';

export interface AgentContext {
  companyId: string;
  instanceName: string;
  companyDescription: string;
  confirmations: PendingConfirmation[];
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
}

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
