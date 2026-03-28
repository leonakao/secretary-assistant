import type { BoundApiClient } from '~/lib/api-client-context';

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
  isInitialized: boolean;
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
  userMessage: OnboardingMessage;
  assistantMessage: OnboardingMessage;
}

export interface InitializeOnboardingConversationResponse {
  company: OnboardingCompany | null;
  onboarding: OnboardingState;
  initialized: boolean;
  assistantMessage: OnboardingMessage | null;
}

export interface SendOnboardingAudioMessageInput {
  audio: Blob;
  durationMs: number;
  mimeType: string;
}

export async function getOnboardingState(client: BoundApiClient): Promise<OnboardingStateResponse> {
  return client.fetchApi<OnboardingStateResponse>('/onboarding/state');
}

export async function createOnboardingCompany(
  input: CreateOnboardingCompanyInput,
  client: BoundApiClient,
): Promise<CreateOnboardingCompanyResponse> {
  return client.fetchApi<CreateOnboardingCompanyResponse>('/onboarding/company', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function sendOnboardingTextMessage(
  input: SendOnboardingMessageInput,
  client: BoundApiClient,
): Promise<SendOnboardingMessageResponse> {
  return client.fetchApi<SendOnboardingMessageResponse>('/onboarding/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const sendOnboardingMessage = sendOnboardingTextMessage;

export async function initializeOnboardingConversation(
  client: BoundApiClient,
): Promise<InitializeOnboardingConversationResponse> {
  return client.fetchApi<InitializeOnboardingConversationResponse>(
    '/onboarding/messages/initialize',
    {
      method: 'POST',
    },
  );
}

export async function sendOnboardingAudioMessage(
  input: SendOnboardingAudioMessageInput,
  client: BoundApiClient,
): Promise<SendOnboardingMessageResponse> {
  const formData = new FormData();
  formData.append('kind', 'audio');
  formData.append('audio', input.audio);
  formData.append('durationMs', String(input.durationMs));
  formData.append('mimeType', input.mimeType);

  return client.fetchApi<SendOnboardingMessageResponse>('/onboarding/messages', {
    method: 'POST',
    body: formData,
  });
}
