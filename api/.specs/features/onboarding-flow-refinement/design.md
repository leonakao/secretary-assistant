# Onboarding Flow Refinement

## Overview

This slice refines the existing onboarding flow without changing the phase gates or the WhatsApp onboarding path. Two applications are affected:

- `api/`: owns onboarding state, idempotent proactive initialization, transcription, and agent context assembly
- `web/`: owns chat UX, focus recovery, hold-to-record audio capture, and rendering of server-owned conversation state

The existing foundation is already present:

- `GET /onboarding/state`
- `POST /onboarding/company`
- `POST /onboarding/messages`
- `OnboardingConversationService`
- `AudioTranscriptionService`

The design extends that foundation instead of introducing a parallel onboarding implementation.

## Design Goals

1. Make the first onboarding chat render feel guided by creating the first assistant message automatically for new web threads.
2. Ensure the onboarding assistant starts with `company.name` and `businessType` from bootstrap, without re-asking for the company name.
3. Make the web composer keyboard-friendly by returning focus after successful sends and recoverable failures.
4. Add audio capture for onboarding web chat using temporary in-memory transport only, with no durable storage of the raw file.
5. Keep the API as the source of truth for thread state, conversation history, and onboarding completion.

## Existing Domain Anchors

- `api/src/modules/onboarding/use-cases/get-onboarding-state.use-case.ts`
  - currently loads onboarding step and transcript
- `api/src/modules/onboarding/use-cases/send-onboarding-message.use-case.ts`
  - currently handles text-only user sends
- `api/src/modules/onboarding/services/onboarding-conversation.service.ts`
  - currently persists text messages and invokes the onboarding agent
- `api/src/modules/ai/services/audio-transcription.service.ts`
  - already transcribes base64 audio through Gemini
- `api/src/modules/onboarding/use-cases/create-onboarding-company.use-case.ts`
  - currently accepts `businessType` but does not persist it

## Required Domain Adjustment

`businessType` is the canonical business-area field for this flow, but today it is not persisted beyond the bootstrap request DTO. That prevents the proactive first message from using stable structured context.

Recommended adjustment:

- add `businessType: string | null` to `Company`
- persist it in `CreateOnboardingCompanyUseCase`
- expose it only where needed for onboarding context assembly; it does not need to be part of every public company payload yet

This is required to satisfy the approved product behavior.

## API Contract Changes

### 1. Extend `GET /onboarding/state`

Purpose:

- keep the onboarding page server-driven
- let the web determine whether to initialize the chat automatically

Recommended response evolution:

```ts
interface OnboardingStateResponse {
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
    role: 'owner' | 'admin' | 'employee';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
  conversation: {
    threadId: string | null;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
    isInitialized: boolean;
  } | null;
}
```

Rule:

- `isInitialized = true` when the thread already has at least one persisted message
- `isInitialized = false` only when onboarding step is `assistant-chat` and the transcript is still empty

### 2. Add proactive initialization endpoint

Recommended endpoint:

- `POST /onboarding/messages/initialize`

Purpose:

- create the first assistant message transparently when the web opens step 2
- guarantee idempotency on refresh or retry

Response:

```ts
interface InitializeOnboardingConversationResponse {
  company: {
    id: string;
    step: 'onboarding' | 'running';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'assistant-chat' | 'complete';
  };
  initialized: boolean;
  assistantMessage: {
    role: 'assistant';
    content: string;
    createdAt: string;
  } | null;
}
```

Rules:

- if company bootstrap is incomplete or the user has no onboarding company, reject with a recoverable domain error
- if the thread already contains messages, return `initialized: false` and `assistantMessage: null`
- if the thread is empty, generate and persist exactly one opening assistant message and return it
- if initialization races in two tabs, only one request may persist the opening message

### 3. Extend `POST /onboarding/messages` for audio

Recommended transport:

- `multipart/form-data`

Reason:

- standard browser-native upload path
- avoids base64 inflation in JSON
- works well with `FormData`, `Blob`, and `MediaRecorder`
- does not require durable file storage to reach the backend

Recommended request contract:

```ts
type TextMessageRequest = {
  kind: 'text';
  message: string;
};

type AudioMessageRequest = multipart/form-data with fields:
- kind = 'audio'
- audio = <browser-native Blob/File>
- durationMs = string
- mimeType = string
```

Recommended response for both text and audio:

```ts
interface SendOnboardingMessageResponse {
  company: {
    id: string;
    step: 'onboarding' | 'running';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'assistant-chat' | 'complete';
  };
  userMessage: {
    role: 'user';
    content: string;
    createdAt: string;
  };
  assistantMessage: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
}
```

The response must include the persisted `userMessage` so the web can replace temporary loading placeholders with server-owned transcript entries.

## Proactive Initialization Strategy

### Why a dedicated initialize endpoint

Overloading `GET /onboarding/state` with mutation would make resume behavior harder to reason about and would create accidental duplicate writes on every reload. A dedicated `POST /onboarding/messages/initialize` keeps reads pure and keeps initialization explicit but transparent to the user.

### Idempotency rule

Initialization must be thread-scoped and data-driven:

- thread key remains `onboarding:${companyId}:${userId}`
- before generating the opening message, the API checks whether memory rows already exist for the thread
- if any row exists, the thread is already initialized
- if none exist, the API loads company context and generates the opening assistant reply

To make concurrent initialization safe:

- perform the existence check and first write inside a transaction or guarded critical section
- if a second request loses the race, it must return the already-initialized outcome without writing a duplicate message

### Opening prompt contract

The opening assistant reply should be driven by the agent, not hardcoded in the controller. The service should invoke the onboarding assistant with a transport-neutral bootstrap prompt such as:

- system intent: start the onboarding conversation proactively for this company
- context: `company.name`, `company.businessType`, owner name if available
- constraint: do not ask for company name again

That keeps tone and future onboarding logic centralized in the agent layer.

## Onboarding Service Refactor

`OnboardingConversationService` should evolve into two explicit entry points:

```ts
initializeThread(input: { userId: string; companyId: string }): Promise<...>
run(input: { userId: string; companyId: string; message: string }): Promise<...>
```

Responsibilities:

- load user and company relation
- enforce `company.step !== 'running'`
- build `AgentContext` with persisted company data
- persist conversation messages in `Memory`
- return updated onboarding state

Required change:

- `AgentContext.companyDescription` is currently always empty
- for onboarding, it should be populated from available structured company context or expanded to include `companyName` and `businessType` explicitly

Preferred approach:

- extend `AgentContext` with `companyName` and `businessType`
- update `OnboardingAssistantAgent` prompt assembly to use those fields directly

This is clearer than overloading `companyDescription`.

## Audio Processing Design

### Web capture model

- use browser `MediaRecorder`
- record only while the user is actively pressing and holding the microphone button
- on release, stop recording and build a temporary `Blob`
- keep the blob only in component state until the user either sends or deletes it

### Backend processing model

- accept the multipart file in memory
- do not write the raw file to disk or durable object storage
- convert the in-memory buffer to base64 only inside the request lifecycle if required by `AudioTranscriptionService`
- transcribe
- reject empty/unsupported/silent results with a 4xx recoverable error
- persist only the final transcribed text and assistant response

### Mime handling

Only the browser-native format must be supported in v1. The web should include the recorder-reported MIME type in the request. The API should validate that the uploaded file MIME matches what the recorder declared and pass that MIME type through to transcription instead of hardcoding `audio/ogg`.

That requires a small extension to `AudioTranscriptionService`:

```ts
transcribeAudioFromBase64(audioBase64: string, mimeType: string): Promise<string>
```

## Web State Model

`OnboardingChat` should move from a simple `isSending` state to a more explicit composer state machine:

- `idle`
- `sending-text`
- `recording-audio`
- `audio-preview`
- `sending-audio`
- `error`

Derived rules:

- text composer is disabled in `sending-text` and `sending-audio`
- new sends are blocked during transcription/assistant round-trip
- the mic button is disabled during active request states
- after recoverable failure, the component returns to `idle` with draft restored

### Focus behavior

The textarea should regain focus:

- after successful text send
- after text send failure with restored draft
- after deleting an audio preview
- after audio send failure

The textarea should not steal focus while the user is holding the record button or while an audio preview card is active.

Implementation note:

- use a dedicated `focusComposer()` helper
- call it in the settled branch of text sends and recoverable failures
- if the current focus issue is due to a disabled textarea losing focus, re-enable before calling `.focus()`

## Web Rendering Model For Audio

The approved UX is:

1. user holds the mic button while speaking
2. on release, the UI shows a preview row with duration and actions to send or discard
3. on send, the transcript appears in the chat as a pending user bubble represented by a skeleton/loading placeholder
4. no new messages may be sent while transcription + assistant processing are in flight
5. when the API returns, replace the pending bubble with the transcribed user message and append the assistant reply

Recommended pending bubble shape:

- role: `user`
- temporary id: `pending-audio-${timestamp}`
- visual: user-aligned bubble skeleton with label like `Transcribing audio...`

This preserves the approved “appears in the chat” behavior without fabricating a transcript before the backend returns it.

## Web/API Responsibility Split

### API

- decide whether thread initialization is allowed
- generate and persist the first assistant message
- persist `businessType`
- transcribe audio in memory
- return canonical persisted user/assistant messages

### Web

- call initialize once after step 2 loads and only when `isInitialized` is false
- keep initialize retries safe
- maintain focus and local draft/audio-preview states
- render placeholders and disabled controls during long-running requests

## Testing Strategy

### API

Unit tests:

- `CreateOnboardingCompanyUseCase` persists `businessType`
- `OnboardingConversationService.initializeThread` creates the first message once
- duplicate initialize call returns no second message
- initialization uses stored `name` and `businessType`
- audio submission path transcribes in memory and persists only transcribed text
- unsupported/empty transcription leaves memory unchanged

Controller/use-case tests:

- `GET /onboarding/state` returns `isInitialized`
- `POST /onboarding/messages/initialize` handles new thread and existing thread
- `POST /onboarding/messages` handles `multipart/form-data` audio and normal text

Regression tests:

- WhatsApp onboarding path still uses `run()` without proactive initialization side effects

### Web

Component tests:

- new thread triggers initialize call once and renders assistant opening message
- revisiting populated thread does not re-initialize
- textarea refocuses after successful text send
- textarea refocuses after failed text send with draft restored
- hold-to-record transitions `idle -> recording-audio -> audio-preview`
- sending audio shows pending user placeholder and disables other sends
- successful audio send replaces pending bubble with transcribed text
- failed audio send preserves preview and shows recoverable error

## Risks And Assumptions

1. `businessType` is not currently persisted in the domain; this must be corrected in API implementation or the feature will not satisfy the approved behavior.
2. Browser audio MIME varies by platform. Supporting only the browser-native format is acceptable for v1, but both web and API must avoid hardcoded assumptions like `audio/ogg`.
3. Concurrent initialize requests are realistic on refresh or duplicate mounting, so idempotency must be enforced server-side, not only in the UI.
