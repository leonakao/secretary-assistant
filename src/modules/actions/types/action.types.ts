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

  // Client actions
  REQUEST_HUMAN_CONTACT = 'REQUEST_HUMAN_CONTACT',
  NOTIFY_USER = 'NOTIFY_USER',

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
  payload: {
    companyName: string;
    description: string;
    businessHours: string;
    phone: string;
    address?: string;
    email?: string;
    pricing?: string;
    deliveryTime?: string;
    serviceArea?: string;
    schedulingInfo?: string;
    cancellationPolicy?: string;
    faq?: string;
    differentiators?: string;
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
  | RequestHumanContactAction
  | NotifyUserAction
  | FinishOnboardingAction
  | NoAction;

export interface ActionDetectionResult {
  requiresAction: boolean;
  actions: Action[];
}
