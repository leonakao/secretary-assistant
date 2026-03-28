# Onboarding Flow Refinement – Web Tasks

**Design**: `.specs/features/onboarding-flow-refinement/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Contracts):
  T1 -> T2 -> T3

Phase 2 (Sequential – Initialization UX):
  T3 -> T4 -> T5

Phase 3 (Sequential – Composer Focus + Audio):
  T5 -> T6 -> T7 -> T8

Phase 4 (Sequential – Tests):
  T8 -> T9
```

---

## Task Breakdown

### T1: Extend onboarding API types for initialization and audio sends

**What**: Update the onboarding API layer to support `conversation.isInitialized`, initialize endpoint typing, and separate text/audio send helpers.
**Where**: `web/app/modules/onboarding/api/onboarding.api.ts`
**Depends on**: None

**Done when**:
- [ ] `OnboardingConversation` includes `isInitialized`
- [ ] API wrapper exists for `POST /onboarding/messages/initialize`
- [ ] API wrapper exists for multipart audio send
- [ ] text send wrapper returns `userMessage` and `assistantMessage`

### T2: Extend onboarding page data loader types

**What**: Propagate the richer conversation contract through onboarding page loader/use-case types.
**Where**: `web/app/modules/onboarding/use-cases/load-onboarding-page-data.ts`, related types
**Depends on**: T1

**Done when**:
- [ ] onboarding page loader exposes `conversation.isInitialized`
- [ ] existing step resolution still works
- [ ] no route typing regressions

### T3: Refactor `OnboardingChat` state model

**What**: Replace the current simple `isSending` boolean with explicit composer states and local placeholder support.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T2

**Done when**:
- [ ] state covers `initializing`, `sending-text`, `recording-audio`, `audio-preview`, `sending-audio`
- [ ] local temporary transcript rows are supported
- [ ] existing text-only path still works

### T4: Add proactive initialization flow to chat mount

**What**: When step 2 opens with `isInitialized=false`, call the initialize endpoint transparently and render assistant loading state.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T3

**Done when**:
- [ ] empty thread triggers initialize exactly once per mount lifecycle
- [ ] loading skeleton is shown while opening message is being generated
- [ ] successful initialize appends the first assistant message
- [ ] initialized threads do not re-run initialization

### T5: Fix composer focus lifecycle

**What**: Add deterministic refocus behavior for text-send success and recoverable failure.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T4

**Done when**:
- [ ] successful text send returns focus to the textarea
- [ ] failed text send restores draft and returns focus
- [ ] deleting audio preview returns focus
- [ ] no focus steal occurs during recording or transcription

### T6: Implement push-to-talk recording and preview UI

**What**: Add microphone button, press-and-hold recording, preview row, and discard action.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T5

**Done when**:
- [ ] recording starts on press
- [ ] recording stops on release/cancel
- [ ] preview shows duration and send/delete actions
- [ ] microphone permission errors are recoverable

### T7: Implement audio send flow with pending transcript bubble

**What**: Submit recorded audio via multipart API and render the approved pending/transcribing UX.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
**Depends on**: T6

**Done when**:
- [ ] sending audio blocks new sends
- [ ] pending user bubble appears during transcription
- [ ] successful response replaces pending bubble with transcribed text
- [ ] assistant reply appends after the transcribed user bubble
- [ ] failed response restores preview for retry/delete

### T8: Update page integration and completion handling

**What**: Pass the richer conversation contract from `OnboardingPage` and preserve completion redirect behavior.
**Where**: `web/app/modules/onboarding/pages/onboarding-page/index.tsx`
**Depends on**: T7

**Done when**:
- [ ] chat receives `isInitialized`
- [ ] completion redirect still goes to `/dashboard`
- [ ] step-2 UX remains resume-safe

### T9: Add web tests for initialization, focus, and audio states

**What**: Cover the new onboarding chat behavior with component and route tests.
**Where**: onboarding component/use-case test files
**Depends on**: T8

**Done when**:
- [ ] initialize runs once for empty thread
- [ ] initialize is skipped for existing thread
- [ ] text send success and failure both handle focus correctly
- [ ] recording -> preview -> send path is covered
- [ ] audio failure restores preview
- [ ] completion redirect still works
