# Onboarding Component Decomposition

## Overview

This refactor should reduce the surface area of `onboarding-chat.tsx` without changing how the onboarding chat behaves.

The current component mixes four different concerns:

1. conversation orchestration and API calls
2. transcript shaping and rendering
3. composer and focus behavior
4. audio recording, preview, and transcription states

The target design keeps `OnboardingChat` as the orchestration boundary and moves rendering-heavy and state-isolated behavior into onboarding-specific subcomponents and hooks.

## Design Goals

1. Preserve current UX, public props, and backend contract behavior.
2. Keep a single source of truth for transcript, composer state, draft text, and audio preview.
3. Extract rendering and browser-API concerns out of the top-level component.
4. Make the audio flow and transcript flow independently testable.
5. Keep the refactor local to onboarding files.

## Current Boundary

Current public contract:

- `OnboardingChat({ conversation, onComplete })`

This should remain unchanged.

`OnboardingPage` should continue to own page-level routing and completion redirect behavior. It should not absorb internal chat logic during this refactor.

## Proposed File Decomposition

Primary target directory:

- `web/app/modules/onboarding/pages/onboarding-page/components/`

Recommended new structure:

- `onboarding-chat.tsx`
- `onboarding-transcript.tsx`
- `onboarding-message-bubble.tsx`
- `onboarding-chat-error-banner.tsx`
- `onboarding-audio-preview.tsx`
- `onboarding-composer.tsx`
- `use-onboarding-audio-recorder.ts`
- `onboarding-chat.types.ts`
- `onboarding-chat.utils.ts`

This keeps the refactor local and easy to review.

## Responsibility Split

### `onboarding-chat.tsx`

Keep as the stateful orchestration component.

Responsibilities:

- own `messages`, `draftText`, `composerState`, `error`, `audioPreview`, `pendingAudioMessageId`
- call onboarding API helpers
- run conversation initialization
- perform optimistic text send
- merge incoming messages idempotently
- decide when completion has happened
- wire child components together

Responsibilities removed from this file:

- transcript row rendering markup
- preview card rendering markup
- composer layout markup
- recorder browser API lifecycle
- formatting and message utility helpers

### `onboarding-transcript.tsx`

Pure rendering component for the scrollable transcript area.

Responsibilities:

- render transcript items in order
- render the assistant initialization skeleton
- render the pending audio transcription placeholder
- render standard message rows
- own `bottomRef` scrolling anchor placement

Props:

- `items: TranscriptItem[]`
- `bottomRef: RefObject<HTMLDivElement | null>`

This component should not know about API calls, `onComplete`, or parent state transitions.

### `onboarding-message-bubble.tsx`

Pure rendering for a single persisted message.

Responsibilities:

- render user vs assistant alignment
- render assistant avatar
- render message bubble styles

Props:

- `message: OnboardingMessage`

This removes repeated bubble logic from the transcript map.

### `onboarding-chat-error-banner.tsx`

Small presentational component for recoverable chat errors.

Responsibilities:

- render error message
- optionally render retry button for uninitialized conversation state

Props:

- `error: string | null`
- `showRetry: boolean`
- `onRetry: (() => void) | null`

### `onboarding-audio-preview.tsx`

Rendering-only component for the recorded-audio preview card.

Responsibilities:

- render duration and mime type
- render browser audio preview
- render delete/send actions

Props:

- `audioPreview: AudioPreviewState`
- `previewUrl: string | null`
- `canSend: boolean`
- `onDelete: () => void`
- `onSend: () => void`

### `onboarding-composer.tsx`

Presentation component for the textarea, mic button, send button, and helper copy.

Responsibilities:

- render current placeholder text
- bind textarea events
- bind recording button events
- bind send action
- show recording duration in helper text

Props should remain explicit and event-driven so state still lives in `OnboardingChat`.

### `use-onboarding-audio-recorder.ts`

Onboarding-specific hook for MediaRecorder and preview URL lifecycle.

Responsibilities:

- start and stop recording
- manage `MediaStream`, `MediaRecorder`, blob chunks, and timing
- produce `audioPreview`
- produce `recordingDurationMs`
- cleanup stream and object URLs on teardown
- expose structured error output to the parent

Recommended return shape:

```ts
{
  audioPreview: AudioPreviewState | null;
  previewUrl: string | null;
  recordingDurationMs: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudioPreview: () => void;
  recorderError: string | null;
}
```

The parent should still decide how recorder errors are surfaced in the shared error banner.

### `onboarding-chat.types.ts`

Move onboarding-chat-local types here:

- `ComposerState`
- `PendingTranscriptItem`
- `TranscriptItem`
- `AudioPreviewState`

This shortens component files and avoids duplicated local type declarations.

### `onboarding-chat.utils.ts`

Move onboarding-chat-local helpers here:

- `isPendingTranscriptItem`
- `formatDuration`
- `mergeMessagesIdempotently`

These are stable pure helpers and should remain easy to test.

## State Design

State ownership should stay intentionally centralized.

Keep in `OnboardingChat`:

- `messages`
- `draftText`
- `composerState`
- `error`
- `pendingAudioMessageId`
- initialization attempt guard

Move into `use-onboarding-audio-recorder`:

- recorder instance refs
- media stream refs
- chunk buffer refs
- preview URL lifecycle
- recording timer internals
- preview blob construction

Do not duplicate transcript or draft state inside children.

## Behavior Preservation Rules

The decomposition must preserve:

- `OnboardingChat` props and usage from `OnboardingPage`
- current placeholder strings and UI copy unless a move is purely mechanical
- current focus timing after init, success, failure, and audio preview deletion
- current optimistic text message flow
- current pending transcription placeholder behavior
- current keyboard behavior for Enter, Shift+Enter, and keyboard-driven recording

## Testing Strategy

Existing `onboarding-chat.test.tsx` should remain the behavioral safety net.

Testing split:

- keep end-to-end chat behavior assertions at `onboarding-chat.test.tsx`
- add focused tests for pure helpers in `onboarding-chat.utils` if the extracted logic becomes non-trivial
- add targeted hook tests for `use-onboarding-audio-recorder` only if the extracted browser-API lifecycle becomes hard to validate through the parent component alone

Priority is behavior coverage, not test count inflation.

## Risks

### Focus Timing Regression

Extracting the composer can accidentally change when `textareaRef` is available. The composer should accept a forwarded textarea ref so `OnboardingChat` still owns focus timing.

### Audio Cleanup Regression

Moving recorder logic into a hook can leak object URLs or streams if cleanup ownership becomes ambiguous. The hook should own the full cleanup lifecycle.

### Over-Fragmentation

Too many tiny components can make the flow harder, not easier, to trace. The split should stop at meaningful seams: transcript, message bubble, error banner, audio preview, composer, audio hook, local types/utils.

## Residual Risk

This refactor intentionally avoids page-level rewrites. `OnboardingPage` remains mostly orchestration-only, and nearby onboarding files should only be touched when required to support the chat decomposition cleanly.
