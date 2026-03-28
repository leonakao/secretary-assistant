# Onboarding Flow Refinement

## Overview

This slice keeps the onboarding page server-driven while removing the UX friction observed in testing. The web app will remain a thin client over backend onboarding state, but it gains three new responsibilities:

- trigger transparent chat initialization when step 2 opens with an empty thread
- maintain deterministic focus behavior for the composer
- support push-to-talk audio capture with a short preview-before-send step

The API continues to own conversation history, completion state, and all assistant-generated content.

## Design Goals

1. When step 2 loads with an empty thread, show the first assistant message automatically with no user action.
2. Avoid regressing resume behavior for existing onboarding conversations.
3. Fix composer focus so keyboard-driven use remains continuous after sends and retries.
4. Add audio recording without introducing durable client-side or server-side media persistence.
5. Keep web state explicit enough to cover text send, audio preview, transcription delay, and retry states.

## Existing Web Anchors

- `web/app/modules/onboarding/pages/onboarding-page/index.tsx`
  - current page loader and step rendering
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
  - current text-only transcript and composer
- `web/app/modules/onboarding/api/onboarding.api.ts`
  - current onboarding API wrappers
- `web/app/lib/api-client-context.tsx`
  - API client binding used by onboarding modules

## Required API Dependencies

The web design assumes these backend contract additions:

1. `GET /onboarding/state` returns `conversation.isInitialized`
2. `POST /onboarding/messages/initialize` creates the opening message at most once
3. `POST /onboarding/messages` supports:
   - text send
   - multipart audio send
   - response with both persisted `userMessage` and `assistantMessage`

The web must not synthesize the first assistant message locally.

## Page-Level Flow

### Step 1

Unchanged except for one dependency:

- the bootstrap request must persist `businessType`, because step 2 depends on it

### Step 2 on first open

1. `OnboardingPage` loads `GET /onboarding/state`
2. if `onboarding.step !== 'assistant-chat'`, existing redirect behavior applies
3. if `conversation.isInitialized === false`, the chat component calls `POST /onboarding/messages/initialize`
4. while initialization is in flight, the transcript shows a single assistant-side loading skeleton
5. when the response arrives, the opening assistant message is appended

### Step 2 on resume

1. `OnboardingPage` loads existing messages
2. if `conversation.isInitialized === true`, the chat renders immediately
3. no initialization request is sent

## Component State Model

`OnboardingChat` should move to an explicit local UI model:

```ts
type ComposerState =
  | 'idle'
  | 'initializing'
  | 'sending-text'
  | 'recording-audio'
  | 'audio-preview'
  | 'sending-audio';
```

Local state buckets:

- `messages`
- `draftText`
- `composerState`
- `error`
- `recording`
  - `blob`
  - `durationMs`
  - `mimeType`
- `pendingAudioMessageId`

Rules:

- `initializing`, `sending-text`, and `sending-audio` all block new sends
- `recording-audio` blocks text send but does not mutate transcript yet
- `audio-preview` blocks recording start until user sends or discards the preview

## Focus Management Design

The current focus bug likely comes from clearing the textarea while toggling `disabled`, without restoring focus after the request settles. The component needs a single focus path.

Recommended approach:

- keep `textareaRef`
- add `focusComposer()` helper with `requestAnimationFrame`
- call `focusComposer()`:
  - after successful text send
  - after failed text send with restored draft
  - after deleting an audio preview
  - after failed audio send

The component should not force focus:

- during `recording-audio`
- during `audio-preview`
- during `sending-audio`

This prevents focus from fighting with the audio interaction itself.

## Audio UX Design

### Interaction

Approved experience:

1. user presses and holds the microphone button
2. recording lasts only while the button remains pressed
3. releasing the button stops capture and opens an audio preview row
4. the preview row shows duration and actions:
   - send
   - delete
5. on send, the preview collapses into a user-aligned pending bubble in the transcript
6. no other sends are allowed until the backend returns
7. the pending bubble is replaced by the transcribed user text and assistant reply

### Browser integration

Recommended implementation:

- use `navigator.mediaDevices.getUserMedia({ audio: true })`
- use `MediaRecorder` with the browser-default MIME type
- store chunks in component state only
- convert chunks to `Blob` when recording stops
- create `File` or `Blob` directly in `FormData`

No client-side durable persistence:

- no IndexedDB
- no local file save
- no service-worker cache

## Transcript Rendering Model

The transcript should support these temporary row types:

- persisted assistant bubble
- persisted user bubble
- assistant initialization skeleton
- pending user-audio skeleton

Recommended temporary item shapes:

```ts
type PendingTranscriptItem =
  | { id: string; kind: 'assistant-loading' }
  | { id: string; kind: 'user-audio-transcribing' };
```

These should stay local only until replaced by canonical API messages.

## API Wrapper Design

`web/app/modules/onboarding/api/onboarding.api.ts` should evolve to include:

```ts
initializeOnboardingConversation(client)
sendOnboardingTextMessage(input, client)
sendOnboardingAudioMessage(input, client)
```

Recommended audio wrapper contract:

```ts
interface SendOnboardingAudioMessageInput {
  audio: Blob;
  durationMs: number;
  mimeType: string;
}
```

Implementation notes:

- use `FormData`
- do not manually set `Content-Type`; let the browser include the multipart boundary

## Onboarding Chat Responsibilities

### Initialization

- on mount, if `conversation.isInitialized === false` and no local initialize call is in flight, call initialize once
- protect against duplicate calls from re-render by storing an `initializationAttemptedRef`
- if initialize returns `initialized: false`, simply clear the loading skeleton and keep current transcript

### Text send

- append optimistic user bubble or keep the current pattern
- if the request fails, revert optimistic bubble, restore draft, and refocus textarea
- if the request succeeds, replace optimistic state with server-returned `userMessage` and `assistantMessage`

Preferred approach:

- continue using optimistic local UX for text
- normalize final message rows from the API response

### Audio send

- do not fabricate transcript text before the API returns
- append a local pending bubble labeled as transcription in progress
- submit multipart request
- when the API responds, replace pending bubble with `userMessage.content`
- append returned assistant message

## Onboarding Page Integration

`OnboardingPage` should pass the richer conversation contract:

```ts
conversation: {
  threadId: string | null;
  isInitialized: boolean;
  messages: OnboardingMessage[];
}
```

The page itself should remain responsible for:

- initial state load
- step resolution
- redirect to `/dashboard` on completion

The chat component should own:

- initialize side effect
- local transcript placeholders
- focus recovery
- audio capture lifecycle

## Error Handling

Recoverable user-facing errors:

- microphone permission denied
- audio format rejected by backend
- empty transcription
- network failure on initialize
- network failure on text send
- network failure on audio send

UI rules:

- initialize failure keeps the page on step 2 and shows retryable error
- text send failure restores the draft
- audio send failure restores the preview row so the user can retry send or delete
- permission denial leaves the text composer usable

## Testing Strategy

### Unit/component tests

- initialization call occurs once for empty thread
- initialization is skipped for populated thread
- text send success refocuses the textarea
- text send failure restores draft and refocuses
- press-and-hold mic starts/stops `MediaRecorder`
- releasing mic opens preview row with duration
- deleting preview returns to idle and refocuses textarea
- sending audio shows pending transcript bubble and disables input
- successful audio response replaces pending bubble with transcribed text
- failed audio response restores preview and keeps transcript clean

### Route/page tests

- `/onboarding` still redirects completed users to `/dashboard`
- resuming an initialized conversation does not call initialize endpoint

## Risks And Assumptions

1. `MediaRecorder` support is broad but not identical across browsers; this slice intentionally supports only the browser-native recording format per the approved scope.
2. The chat component must guard against double initialization caused by React mount/re-render behavior.
3. The web fix for focus depends on avoiding situations where the textarea stays disabled when `.focus()` is called.
