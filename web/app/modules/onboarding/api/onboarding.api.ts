import { fetchApi } from '~/lib/api.client';

export interface OnboardingCompany {
  id: string;
  name: string;
  step: 'onboarding' | 'running';
  role: 'owner' | 'admin' | 'employee';
}

export interface OnboardingState {
  requiresOnboarding: boolean;
  step: 'company-bootstrap' | 'assistant-chat' | 'complete';
}

export interface OnboardingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface OnboardingConversation {
  threadId: string | null;
  messages: OnboardingMessage[];
}

export interface OnboardingStateResponse {
  company: OnboardingCompany | null;
  onboarding: OnboardingState;
  conversation: OnboardingConversation | null;
}

export interface CreateOnboardingCompanyInput {
  name: string;
  businessType: string;
}

export interface CreateOnboardingCompanyResponse {
  company: OnboardingCompany | null;
  onboarding: OnboardingState;
}

export interface SendOnboardingMessageInput {
  message: string;
}

export interface SendOnboardingMessageResponse {
  company: OnboardingCompany | null;
  onboarding: OnboardingState;
  assistantMessage: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
}

export async function getOnboardingState(): Promise<OnboardingStateResponse> {
  return fetchApi<OnboardingStateResponse>('/onboarding/state');
}

export async function createOnboardingCompany(
  input: CreateOnboardingCompanyInput,
): Promise<CreateOnboardingCompanyResponse> {
  return fetchApi<CreateOnboardingCompanyResponse>('/onboarding/company', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function sendOnboardingMessage(
  input: SendOnboardingMessageInput,
): Promise<SendOnboardingMessageResponse> {
  return fetchApi<SendOnboardingMessageResponse>('/onboarding/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
