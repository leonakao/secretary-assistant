# Resilient Chat Messaging — Web Tasks

Tasks are ordered by dependency. Type definitions first, then behavior, then UI.

---

### Task 1 — Update API type definitions
**Files to modify:**
- `web/app/modules/onboarding/api/onboarding.api.ts`

**What:**
- Change `SendOnboardingMessageResponse` to `{ status: 'pending'; userMessageId: string }`
- Add `onboarding: OnboardingState` field to `OnboardingConversation` interface
- Add `isTyping: boolean` field to `OnboardingConversation` interface
- No changes to function signatures — only return types

**Done when:** `npx tsc --noEmit` passes with the new types; existing callers that use `response.assistantMessage` will produce type errors (intentionally — guides what to fix next)
**No dependencies**

---

### Task 2 — Add `awaiting-reply` to `ComposerState`
**Files to modify:**
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.types.ts`

**What:** Add `'awaiting-reply'` to the `ComposerState` union type

**Done when:** Type compiles; `isBusy` logic in `onboarding-chat.tsx` includes `awaiting-reply` (update that too)
**Depends on:** Task 1

---

### Task 3 — Create `useOnboardingPolling` hook
**Files to create:**
- `web/app/modules/onboarding/pages/onboarding-page/components/use-onboarding-polling.ts`

**What:** Custom hook that:
- Accepts `{ enabled, client, expectedMinCount, intervalMs=2000, timeoutMs=30000, onPoll, onSuccess, onTimeout }`
- When `enabled=true`: starts a polling loop using recursive `setTimeout`
- Each iteration: calls `getOnboardingMessages(client)`, then calls `onPoll(conversation)` on every successful response
- If `messages.length > expectedMinCount` → calls `onSuccess(conversation)`, stops
- If elapsed >= `timeoutMs` → calls `onTimeout()`, stops
- Cleans up timers on unmount or when `enabled` becomes false

`onPoll` is distinct from `onSuccess`: it fires on every response regardless of message count change. Consumers use it to update `isTyping` state.

**Done when:** Unit test: mocking `getOnboardingMessages` verifies `onPoll` is called on each iteration; `onSuccess` fires on count increase; `onTimeout` fires after mocked elapsed time
**Depends on:** Task 1

---

### Task 4 — Refactor `handleTextSend` to use 202 + polling pattern
**Files to modify:**
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`

**What:**
1. Add `pendingMessageCountRef = useRef<number>(0)` — records message count at time of send
2. Add `lastSentTextRef = useRef<string>('')` — holds last sent text for retry
3. Add `const [isTypingFromServer, setIsTypingFromServer] = useState(false)` — tracks typing state from poll responses
4. In `handleTextSend()` after POST:
   - Old: destructure `response.userMessage, response.assistantMessage, response.onboarding` and update messages
   - New: record `pendingMessageCountRef.current = messages.length + 1` (user message added optimistically), set `composerState('awaiting-reply')`
5. Add `useEffect` keyed on `composerState === 'awaiting-reply'` that enables `useOnboardingPolling` with:
   - `onPoll(conversation)`: `setIsTypingFromServer(conversation.isTyping)`
   - `onSuccess(conversation)`: `setMessages(conversation.messages)`, check `conversation.onboarding.step` for completion, `setComposerState('idle')`, `focusComposer()`
   - `onTimeout()`: `setComposerState('idle')`, `setDraftText(lastSentTextRef.current)`, `setError('No reply received within 30 seconds. Please try again.')`
6. Remove messages filtering logic that referenced `response.assistantMessage`

**Done when:** Text send flow works end-to-end in integration; typing bubble visible during wait; reply appears without refresh; retry on timeout restores draft
**Depends on:** Tasks 2, 3

---

### Task 5 — Refactor `handleAudioSend` to use 202 + polling pattern
**Files to modify:**
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`

**What:** Same structural change as Task 4 but for audio:
1. After POST returns 202: `clearAudioPreview()`, `setPendingAudioMessageId(null)`, set `composerState('awaiting-reply')` (not 'idle')
2. Polling detects assistant reply same as text path
3. On timeout: `setComposerState('audio-preview')` (user can retry the audio send)

**Done when:** Audio send flow works end-to-end; existing audio-specific test scenarios still pass
**Depends on:** Tasks 2, 3

---

### Task 6 — Show assistant loading bubble during `awaiting-reply`
**Files to modify:**
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`

**What:** In `transcriptItems` computation, show the assistant-loading bubble when in `awaiting-reply` state. The bubble is shown optimistically (always while `awaiting-reply`) since `isTyping` from the server may not arrive until the first poll (≤2s delay):
```typescript
if (composerState === 'initializing' || composerState === 'awaiting-reply') {
  baseItems.push({ id: 'assistant-loading', kind: 'assistant-loading' });
}
```

`isTypingFromServer` is available as state but is NOT used as the sole condition for showing the bubble — this avoids a flash of no-bubble during the pre-first-poll window. `isTyping: false` from the server does NOT remove the bubble during `awaiting-reply`.

**Done when:** Loading bubble visible in transcript while in `awaiting-reply` state; bubble disappears when state returns to `idle`
**Depends on:** Tasks 2, 4

---

### Task 7 — Update error banner retry for polling timeout
**Files to modify:**
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`
- `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat-error-banner.tsx` (if needed)

**What:** The timeout error message differs from initialization failure. The retry button should re-send the draft text (which was restored in Task 4). Confirm `OnboardingChatErrorBanner` shows retry correctly for this case.

Current `showRetry` condition: `!isConversationInitialized && composerState === 'idle'`. After the async refactor, the conversation IS initialized at this point (user already sent a message), so `showRetry` condition must be updated:

```typescript
const showRetry = (!isConversationInitialized && composerState === 'idle')
  || (error !== null && draftText.trim().length > 0 && composerState === 'idle');
```

The `onRetry` callback for the timeout case triggers `handleTextSend()` with the restored draft.

**Done when:** On polling timeout: error banner appears, retry button is visible, clicking retry re-submits the message
**Depends on:** Task 4

---

### Task 8 — Update `onboarding.api.ts` for `SendOnboardingAudioMessageResponse`
**Files to modify:**
- `web/app/modules/onboarding/api/onboarding.api.ts`

**What:** Ensure `sendOnboardingAudioMessage` return type is also `SendOnboardingMessageResponse` (i.e. `{ status: 'pending'; userMessageId: string }`). This may already be covered by Task 1 if the alias is shared — verify and confirm type consistency.

**Done when:** `npx tsc --noEmit` passes; no type errors from audio send path
**Depends on:** Task 1

---

### Task 9 — Run type check and lint
**Files:** All modified files
**What:** `npx tsc --noEmit && pnpm lint` — fix any remaining type errors or lint warnings introduced by the refactor
**Done when:** Both commands exit 0
**Depends on:** Tasks 1–8
