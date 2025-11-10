export enum ActionType {
  // Owner actions
  SEND_MESSAGE = 'SEND_MESSAGE',
  SCHEDULE_APPOINTMENT = 'SCHEDULE_APPOINTMENT',
  UPDATE_CONTACT = 'UPDATE_CONTACT',
  CREATE_CONTACT = 'CREATE_CONTACT',
  SEARCH_CONTACT = 'SEARCH_CONTACT',
  SEARCH_CONVERSATION = 'SEARCH_CONVERSATION',
  LIST_APPOINTMENTS = 'LIST_APPOINTMENTS',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  UPDATE_COMPANY = 'UPDATE_COMPANY',

  // Client actions
  REQUEST_HUMAN_CONTACT = 'REQUEST_HUMAN_CONTACT',
  NOTIFY_USER = 'NOTIFY_USER',

  // Service Request actions (Client & Owner)
  CREATE_SERVICE_REQUEST = 'CREATE_SERVICE_REQUEST',
  UPDATE_SERVICE_REQUEST = 'UPDATE_SERVICE_REQUEST',
  QUERY_SERVICE_REQUEST = 'QUERY_SERVICE_REQUEST',
  LIST_SERVICE_REQUESTS = 'LIST_SERVICE_REQUESTS',
  CANCEL_SERVICE_REQUEST = 'CANCEL_SERVICE_REQUEST',

  // Onboarding actions
  FINISH_ONBOARDING = 'FINISH_ONBOARDING',

  NONE = 'NONE',
}

export interface BaseAction {
  type: ActionType;
  confidence: number;
}

export interface SendMessageAction extends BaseAction {
  type: ActionType.SEND_MESSAGE;
  payload: {
    recipientName: string;
    recipientPhone?: string;
    message: string;
  };
}

export interface ScheduleAppointmentAction extends BaseAction {
  type: ActionType.SCHEDULE_APPOINTMENT;
  payload: {
    contactName: string;
    contactPhone?: string;
    date: string;
    time: string;
    description?: string;
  };
}

export interface UpdateContactAction extends BaseAction {
  type: ActionType.UPDATE_CONTACT;
  payload: {
    contactName: string;
    contactPhone?: string;
    updates: {
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    };
  };
}

export interface CreateContactAction extends BaseAction {
  type: ActionType.CREATE_CONTACT;
  payload: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
}

export interface SearchContactAction extends BaseAction {
  type: ActionType.SEARCH_CONTACT;
  payload: {
    query: string;
  };
}

export interface SearchConversationAction extends BaseAction {
  type: ActionType.SEARCH_CONVERSATION;
  payload: {
    contactName?: string;
    contactPhone?: string;
    query: string;
    days?: number;
  };
}

export interface ListAppointmentsAction extends BaseAction {
  type: ActionType.LIST_APPOINTMENTS;
  payload: {
    startDate?: string;
    endDate?: string;
    contactName?: string;
  };
}

export interface CancelAppointmentAction extends BaseAction {
  type: ActionType.CANCEL_APPOINTMENT;
  payload: {
    appointmentId?: string;
    contactName?: string;
    date?: string;
  };
}

export interface RequestHumanContactAction extends BaseAction {
  type: ActionType.REQUEST_HUMAN_CONTACT;
  payload: {
    reason?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
}

export interface NotifyUserAction extends BaseAction {
  type: ActionType.NOTIFY_USER;
  payload: {
    message: string;
    context?: string;
  };
}

export interface FinishOnboardingAction extends BaseAction {
  type: ActionType.FINISH_ONBOARDING;
}

export interface UpdateCompanyAction extends BaseAction {
  type: ActionType.UPDATE_COMPANY;
  payload: {
    updateRequest: string;
  };
}

export interface CreateServiceRequestAction extends BaseAction {
  type: ActionType.CREATE_SERVICE_REQUEST;
  payload: {
    relevantMessages: string[]; // Messages from conversation that contain the request
  };
}

export interface UpdateServiceRequestAction extends BaseAction {
  type: ActionType.UPDATE_SERVICE_REQUEST;
  payload: {
    relevantMessages: string[]; // Messages from conversation that contain the update request
  };
}

export interface QueryServiceRequestAction extends BaseAction {
  type: ActionType.QUERY_SERVICE_REQUEST;
  payload: {
    relevantMessages: string[]; // Messages from conversation that contain the query
  };
}

export interface ListServiceRequestsAction extends BaseAction {
  type: ActionType.LIST_SERVICE_REQUESTS;
  payload: {
    requestType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  };
}

export interface CancelServiceRequestAction extends BaseAction {
  type: ActionType.CANCEL_SERVICE_REQUEST;
  payload: {
    requestId?: string;
    requestType?: string;
    reason?: string;
  };
}

export interface NoAction extends BaseAction {
  type: ActionType.NONE;
  payload: null;
}

export type Action =
  | SendMessageAction
  | ScheduleAppointmentAction
  | UpdateContactAction
  | CreateContactAction
  | SearchContactAction
  | SearchConversationAction
  | ListAppointmentsAction
  | CancelAppointmentAction
  | UpdateCompanyAction
  | RequestHumanContactAction
  | NotifyUserAction
  | FinishOnboardingAction
  | CreateServiceRequestAction
  | UpdateServiceRequestAction
  | QueryServiceRequestAction
  | ListServiceRequestsAction
  | CancelServiceRequestAction
  | NoAction;

export interface ActionDetectionResult {
  requiresAction: boolean;
  actions: Action[];
}
