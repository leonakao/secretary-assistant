# Onboarding Component Decomposition – Web Tasks

**Design**: `.specs/features/onboarding-component-decomposition/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Stable Extraction Surface):
  T1 → T2 → T3

Phase 2 (Sequential – Transcript Rendering Split):
  T3 → T4 → T5

Phase 3 (Sequential – Composer and Audio UI Split):
  T5 → T6 → T7

Phase 4 (Sequential – Recorder Hook Extraction):
  T7 → T8

Phase 5 (Sequential – Verification):
  T8 → T9
```

---

## Task Breakdown

### T1: Extract local chat types

**What**: Move onboarding-chat-local types into a dedicated file.
**Where**: new `onboarding-chat.types.ts`, update `onboarding-chat.tsx`
**Depends on**: None

**Done when**:
- [ ] `ComposerState`, `PendingTranscriptItem`, `TranscriptItem`, and `AudioPreviewState` are no longer declared inline in `onboarding-chat.tsx`
- [ ] type names remain unchanged where behavior tests depend on current semantics

---

### T2: Extract pure chat helpers

**What**: Move pure helper logic into `onboarding-chat.utils.ts`.
**Where**: new `onboarding-chat.utils.ts`, update `onboarding-chat.tsx`
**Depends on**: T1

**Done when**:
- [ ] `isPendingTranscriptItem`, `formatDuration`, and `mergeMessagesIdempotently` are extracted
- [ ] helper behavior remains unchanged
- [ ] helper imports keep `onboarding-chat.tsx` shorter and easier to scan

---

### T3: Extract error banner component

**What**: Move recoverable error rendering into a dedicated presentational component.
**Where**: new `onboarding-chat-error-banner.tsx`, update `onboarding-chat.tsx`
**Depends on**: T2

**Done when**:
- [ ] retry button behavior remains unchanged
- [ ] error display logic is no longer embedded in the main return tree
- [ ] parent still controls retry conditions

---

### T4: Extract transcript and message bubble components

**What**: Move transcript rendering and persisted message row rendering out of the main chat component.
**Where**: new `onboarding-transcript.tsx`, new `onboarding-message-bubble.tsx`, update `onboarding-chat.tsx`
**Depends on**: T3

**Done when**:
- [ ] assistant initialization skeleton still renders exactly when initialization is pending
- [ ] pending transcription placeholder still renders exactly when audio is being processed
- [ ] persisted message rows keep current alignment and styling behavior
- [ ] transcript scrolling anchor still works

---

### T5: Extract audio preview component

**What**: Move recorded-audio preview card rendering out of the main chat component.
**Where**: new `onboarding-audio-preview.tsx`, update `onboarding-chat.tsx`
**Depends on**: T4

**Done when**:
- [ ] preview playback UI remains unchanged
- [ ] send and delete actions still call parent handlers
- [ ] preview rendering is removed from the main chat JSX body

---

### T6: Extract composer component

**What**: Move textarea, mic button, send button, and helper copy into `onboarding-composer.tsx`.
**Where**: new `onboarding-composer.tsx`, update `onboarding-chat.tsx`
**Depends on**: T5

**Done when**:
- [ ] textarea still supports Enter to send and Shift+Enter for newline
- [ ] forwarded textarea ref keeps focus behavior under parent control
- [ ] recording button pointer and keyboard interactions remain unchanged
- [ ] current placeholder behavior remains unchanged

---

### T7: Extract audio recorder hook

**What**: Move MediaRecorder, MediaStream, chunk buffering, preview URL lifecycle, and timer logic into a dedicated onboarding hook.
**Where**: new `use-onboarding-audio-recorder.ts`, update `onboarding-chat.tsx`
**Depends on**: T6

**Done when**:
- [ ] recorder internals are removed from the main component
- [ ] cleanup for stream and object URLs still happens reliably
- [ ] audio preview creation behavior is preserved
- [ ] recorder errors can still be surfaced through the existing chat error flow

---

### T8: Simplify `onboarding-chat.tsx` to orchestration

**What**: Reduce the main chat component to orchestration, state ownership, and child composition.
**Where**: `onboarding-chat.tsx`
**Depends on**: T7

**Done when**:
- [ ] API calls and top-level chat state remain in `onboarding-chat.tsx`
- [ ] transcript/composer/audio-preview rendering no longer dominate the file
- [ ] file is materially smaller and easier to read than the current 709-line version

---

### T9: Preserve and tighten regression coverage

**What**: Update tests to assert unchanged behavior after decomposition.
**Where**: existing `onboarding-chat.test.tsx`, optional new tests for extracted helpers/hooks if needed
**Depends on**: T8

**Done when**:
- [ ] current onboarding chat behavior tests still pass or are replaced with equivalent coverage
- [ ] focus, init, text send, audio preview, and pending transcription remain covered
- [ ] `npx tsc --noEmit`, `pnpm lint`, and relevant tests pass
