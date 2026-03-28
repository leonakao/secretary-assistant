# Onboarding Flow Refinement

## Summary

The onboarding experience must feel guided, state-aware, and fast to use on the web.

- The onboarding assistant must proactively open the chat by sending the first message in the web onboarding flow.
- The assistant must start with company context already collected in the bootstrap step, including company name and business area, and must not ask for the company name again.
- The onboarding chat input must reliably return focus to the message composer after sending so the user can continue typing without extra clicks.
- The onboarding chat must support audio capture from the web client, with transcription handled by the backend and without durable persistence of the raw audio file unless temporary transport storage is strictly required.

This feature refines the existing web onboarding experience and the API contracts that support it. It does not redefine the WhatsApp onboarding behavior.

## Problem

The current onboarding flow works, but it creates friction in the first critical interaction with a new business owner.

Today:

- the user enters the chat and sees an empty assistant state instead of a guided opening
- the assistant does not reliably start from the company context that was already captured in step 1
- after sending a message, the user loses typing focus and must click back into the composer
- the web onboarding flow does not yet support recorded audio input

These gaps make onboarding feel less polished, increase repetition, and slow down completion.

## Goal

Deliver a smoother onboarding conversation that starts proactively, respects previously collected company data, keeps the user in a continuous typing flow, and accepts audio input in the web chat.

## In Scope

- Proactive first assistant message in the web onboarding chat
- Reuse of bootstrap company data in the onboarding assistant context
- Prevention of repeated company-name questions in the onboarding flow
- Automatic input refocus after successful send and recoverable send failures
- Audio recording and sending in the web onboarding chat
- Backend onboarding endpoint support for text and audio message submission
- Backend audio transcription for web onboarding messages
- Temporary-only handling of raw audio payloads during request processing
- Conversation persistence for assistant and user text content derived from onboarding messages

## Out of Scope

- Redesign of WhatsApp onboarding initiation behavior
- Audio message playback library or persistent media gallery
- General-purpose audio support for every other chat surface in the product
- Changes to onboarding completion criteria beyond what is needed to support the refined flow
- Voice synthesis or spoken assistant replies
- Long-term storage of raw audio files

## Users

- New owner who just completed company bootstrap and enters onboarding chat for the first time
- Returning owner resuming an incomplete onboarding conversation on the web

## User States

### Authenticated + bootstrap just completed

- Step 1 has already collected the company name and business area
- entering step 2 should trigger a proactive assistant opening message
- the opening message should mention the company by name

### Authenticated + onboarding in progress

- returning to `/onboarding` should resume the same thread
- if a proactive opening message was already created for the thread, it must not be recreated
- the user can continue with text or audio input

### Authenticated + onboarding complete

- the user should not re-enter the onboarding chat flow

## Onboarding Flow

### Step 1: Company Bootstrap

Purpose:
- create the company in onboarding mode
- capture minimum structured company context for the next step

Expected behavior:
- company name is stored during bootstrap
- business area or category is stored during bootstrap
- step 2 receives enough company context to avoid re-asking for company name

### Step 2: Onboarding Chat Opening

Purpose:
- start the onboarding conversation proactively
- make the experience feel guided rather than empty

Expected behavior:
- when the user reaches step 2 and the thread has no prior assistant or user messages, the system creates the first assistant message automatically
- the first assistant message references the company name naturally
- the first assistant message uses existing company context and does not ask "what is your company name?"
- if the thread already has messages, loading the page must only resume the conversation and must not generate a duplicate opening message

### Step 2: Ongoing Text Chat

Purpose:
- let the user answer quickly with low friction

Expected behavior:
- after the user sends a text message successfully, focus returns to the chat input automatically
- after a send failure, the typed content is restored and focus returns to the chat input so the user can retry immediately
- while a request is in flight, the UI may temporarily disable input controls, but focus behavior must recover when the request settles

### Step 2: Ongoing Audio Chat

Purpose:
- let the user answer onboarding questions by voice

Expected behavior:
- the user can start, stop, and submit an audio recording from the web onboarding chat
- the web client sends the audio payload to the onboarding API without durable file persistence
- the backend transcribes the audio and passes the resulting text into the same onboarding assistant flow used for text messages
- the stored conversation history persists the transcribed user message and the assistant reply, not the raw audio file
- if transcription fails or returns empty content, the user receives a recoverable error and can retry

## Business Rules

1. The proactive first message is a web onboarding behavior and must not change how WhatsApp onboarding conversations are initiated.
2. Backend onboarding state remains the source of truth for whether the onboarding thread is new, in progress, or complete.
3. Company name and business area collected during bootstrap must be available to the onboarding assistant before the first web onboarding reply is generated.
4. The onboarding assistant must not ask for the company name again when that value already exists from bootstrap.
5. The first proactive message must be created at most once per onboarding thread.
6. Audio and text messages must converge into a single onboarding conversation history model.
7. Raw audio must not be stored durably as part of onboarding history unless a temporary transport mechanism is technically required during request processing.
8. The backend must persist only the content needed to resume the onboarding conversation, including the final transcribed user text and assistant responses.
9. Loss of frontend focus after send is considered a usability defect and must be resolved for both successful sends and recoverable send errors.

## Cross-App Responsibilities

### Web

- Detect when onboarding step 2 is opening a brand-new thread and request or display the proactive first message
- Render existing conversation history, including the proactive first message
- Preserve input focus after send lifecycle events
- Provide audio recording controls and upload the recorded payload to the API
- Show recording, sending, transcription, and recoverable error states

### API

- Expose onboarding chat behavior that can create the first assistant message for a new thread without waiting for a user-authored text message
- Build onboarding assistant context from stored company data, including company name and business area
- Accept onboarding message submissions as either text input or audio input
- Transcribe inbound audio and route the resulting text through the existing onboarding conversation service
- Persist only conversation text artifacts required for resume behavior

### Shared Contract Dependencies

- The web app needs a deterministic signal for whether the onboarding conversation is empty or already initialized
- The API needs a request contract that distinguishes text submission from audio submission
- The API response contract must let the web app append assistant replies and detect onboarding completion consistently for both text and audio sends

## Edge Cases

### Duplicate proactive initialization

- refreshing the page, reopening `/onboarding`, or retrying a failed load must not create duplicate opening assistant messages

### Missing business area

- if legacy or partial bootstrap data includes company name but not business area, the assistant may ask for the missing business area, but must still avoid asking for the company name again

### Missing company context entirely

- if step 2 is reached without required bootstrap context because of inconsistent stored state, the system must fail in a recoverable way and direct the user back to the bootstrap step or an equivalent recovery path

### Send failure after optimistic UI update

- the failed optimistic user message must be reverted or marked failed deterministically
- the draft content must be restorable without forcing the user to retype

### Empty or unsupported audio

- if the user submits silent, empty, or unsupported audio, the system must return a clear recoverable error and leave the conversation thread unchanged

### Slow transcription

- the UI must communicate that the message is being processed and must prevent duplicate accidental submissions during the same request

## Non-Functional Requirements

- The onboarding chat must feel responsive on desktop and mobile web
- Audio upload and transcription handling must avoid durable raw-media persistence by default
- The feature must preserve resume behavior across refreshes
- Focus behavior must work for keyboard-driven users, not only mouse users
- New contracts must remain explicit and testable across `web/` and `api/`

## Acceptance Criteria

1. When a user completes bootstrap and opens step 2 with an empty onboarding thread, the assistant sends the first onboarding message automatically without waiting for user input.
2. The proactive first onboarding message mentions the stored company name.
3. When company name is already known from bootstrap, the assistant does not ask the user to provide the company name again.
4. When business area is already known from bootstrap, the assistant can use it in context instead of re-collecting it immediately.
5. Reloading or revisiting the onboarding page with an existing thread does not create a duplicate proactive first message.
6. After a successful text send in the onboarding web chat, keyboard focus returns to the message input automatically.
7. After a recoverable text send failure, the draft message is restored and keyboard focus returns to the message input automatically.
8. The onboarding web chat provides a way to record and submit an audio message.
9. An audio onboarding message is transcribed by the backend and processed by the same onboarding assistant flow used for text.
10. The resumed conversation history shows the transcribed user content and assistant response after an audio submission.
11. Raw onboarding audio is not stored durably as part of conversation history.
12. If transcription fails or yields no usable text, the user receives a recoverable error and can retry without corrupting the thread.

## Open Decisions To Confirm

1. Should the proactive first assistant message be created automatically on page load for a new step-2 thread, or only after the page confirms that bootstrap data is complete and the thread is empty via a dedicated API contract?
2. What is the canonical company field for "area of atuação" in the current domain model: existing category/type data, a description field, or a new structured field?
3. For web audio transport, should the API accept multipart upload, raw binary stream, or base64-in-JSON as the preferred contract?
4. Which audio formats must be supported in v1 of this refinement on the web: browser-default only, or a defined set such as `audio/webm` and `audio/ogg`?
5. Should the UI expose the transcribed text back to the user before submission in a later iteration, or is submit-recording-directly sufficient for this scope?
