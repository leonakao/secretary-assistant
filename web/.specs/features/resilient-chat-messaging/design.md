# Resilient Chat Messaging — Web Design

## What Changes

The onboarding chat's `POST /onboarding/messages` endpoint now returns `202 { status: 'pending', userMessageId }` instead of the full synchronous response with `assistantMessage`. The frontend must poll `GET /onboarding/messages` until the assistant reply appears.

No new API client functions are needed — `getOnboardingMessages` already exists.

---

## New User-Facing Behavior

1. User sends a message → optimistic user bubble appears immediately (unchanged)
2. `POST /onboarding/messages` returns 202 → enter `awaiting-reply` state
3. A "typing" loading bubble appears in the transcript
4. Frontend polls `GET /onboarding/messages` every 2 seconds
5. When message count increases (assistant reply appeared): update messages, exit polling, set state to `idle`
6. If 30 seconds elapse with no reply: show error banner with retry button

---

## API Contract Changes

### `POST /onboarding/messages`

**Old response:**
```typescript
{
  company: OnboardingCompany | null;
  onboarding: OnboardingState;
  userMessage: OnboardingMessage;
  assistantMessage: OnboardingMessage;
}
```

**New response:**
```typescript
{
  status: 'pending';
  userMessageId: string;
}
```

### `GET /onboarding/messages`

**Old response:** `OnboardingConversation { threadId, isInitialized, messages }`

**New response:** Same plus `onboarding: OnboardingState` (completion detection) and `isTyping: boolean` (UX indicator)
```typescript
{
  threadId: string | null;
  isInitialized: boolean;
  messages: OnboardingMessage[];
  onboarding: OnboardingState; // ← new field
  isTyping: boolean;           // ← new field: true while backend is generating a reply
}
```

`isTyping` is sourced from Redis (`ChatStateService` on the API). It returns `false` when Redis is unavailable — the typing bubble degrades gracefully.

---

## Frontend Architecture

### State Machine

The `ComposerState` type gains one new value:

```typescript
type ComposerState =
  | 'loading-history'
  | 'initializing'
  | 'idle'
  | 'sending-text'      // POST in flight (brief, returns 202 quickly)
  | 'awaiting-reply'    // ← NEW: polling for assistant reply
  | 'sending-audio'     // POST in flight
  | 'recording-audio'
  | 'audio-preview'
  | 'completing';
```

`awaiting-reply` is treated as "busy" (disables input, shows loading).

### Polling Mechanism

A `useOnboardingPolling` hook (or inline `useEffect` in `onboarding-chat.tsx`) implements polling:

```
Input:
  - enabled: boolean (true while awaiting-reply)
  - currentMessageCount: number (stop condition: count increased)
  - onPoll(conversation): void  // called on every successful response
  - onSuccess(conversation): void  // called when message count increases
  - onTimeout(): void

Behavior:
  - while enabled: GET /onboarding/messages every 2s (recursive setTimeout)
  - on each response: call onPoll(conversation) — consumer can update isTyping state
  - if messages.length > currentMessageCount → call onSuccess, stop
  - if 30s elapsed without success → call onTimeout, stop
  - cleans up on unmount
```

Using recursive `setTimeout` (vs `setInterval`) avoids overlapping requests if a poll takes longer than 2s.

### Transcript Changes

**Typing bubble:** Shown when `isTyping === true` from the latest poll response. When Redis is down, `isTyping` is always `false` — the bubble won't show, but polling continues and the reply still appears when the message count increases.

**Note:** During the brief window between entering `awaiting-reply` and the first poll (≤2s), `isTyping` has not yet been received. Show the typing bubble optimistically during this window, then switch to the server-driven `isTyping` value.

**On timeout:** Show error banner with retry button. The retry button re-sends the last message (clears `awaiting-reply`, restores draft text).

---

## Component / File Changes

### `onboarding.api.ts`

**File:** `web/app/modules/onboarding/api/onboarding.api.ts`

Update type definitions:
```typescript
// Changed:
export interface SendOnboardingMessageResponse {
  status: 'pending';
  userMessageId: string;
}

// Changed (two new fields):
export interface OnboardingConversation {
  threadId: string | null;
  isInitialized: boolean;
  messages: OnboardingMessage[];
  onboarding: OnboardingState; // ← new
  isTyping: boolean;           // ← new
}
```

No changes to the actual `sendOnboardingTextMessage` or `sendOnboardingAudioMessage` function signatures — only the return type.

### `onboarding-chat.types.ts`

**File:** `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.types.ts`

Add `'awaiting-reply'` to `ComposerState` union type.

### `onboarding-chat.tsx`

**File:** `web/app/modules/onboarding/pages/onboarding-page/components/onboarding-chat.tsx`

Key changes:

1. **`isBusy` includes `awaiting-reply`:**
```typescript
const isBusy =
  composerState === 'loading-history' ||
  composerState === 'initializing' ||
  composerState === 'sending-text' ||
  composerState === 'awaiting-reply' ||   // ← add
  composerState === 'sending-audio' ||
  composerState === 'completing';
```

2. **New state:** `lastSentMessageRef` to hold the draft text for retry on timeout.

3. **New state:** `pendingMessageCount` — captured when polling starts (to detect when count increases).

4. **`handleTextSend` change:**
```
Old: POST → response includes assistantMessage → setMessages([...userMessage, assistantMessage])
New: POST → response is { status, userMessageId } → setComposerState('awaiting-reply'), start polling
```

5. **`handleAudioSend` change:** Same pattern as text.

6. **`isTyping` state:** Add `const [isTypingFromServer, setIsTypingFromServer] = useState(false)`. Updated on every poll via `onPoll(conversation)` callback: `setIsTypingFromServer(conversation.isTyping)`.

7. **Polling effect:** `useEffect` keyed on `composerState === 'awaiting-reply'`:
   - Starts polling loop via `getOnboardingMessages()`
   - `onPoll`: update `isTypingFromServer`
   - On success: `setMessages(result.messages)`, check `result.onboarding.step` for completion, `setComposerState('idle')`
   - On timeout: `setComposerState('idle')`, `setError('timeout')`, restore draft text from ref

8. **Transcript:** `awaiting-reply` shows assistant-loading bubble when `isTypingFromServer === true` OR when in the optimistic pre-first-poll window. Concretely: show bubble if `composerState === 'awaiting-reply'` (optimistic) and update to server-driven once first poll returns.

   Simplest implementation: always show the bubble during `awaiting-reply` (as originally planned). The `isTyping` field can be used in a follow-up to make the bubble conditional if desired. The key correctness change is that `isTyping: false` does NOT stop polling — only message count or timeout does.

8. **Error banner retry:** Existing `OnboardingChatErrorBanner` with `onRetry` re-sends the last message.

### New hook (optional): `useOnboardingPolling`

**File:** `web/app/modules/onboarding/pages/onboarding-page/components/use-onboarding-polling.ts`

Encapsulates the polling loop to keep `onboarding-chat.tsx` clean:

```typescript
interface UseOnboardingPollingOptions {
  enabled: boolean;
  client: BoundApiClient;
  expectedMinCount: number; // poll stops when messages.length > this
  intervalMs?: number; // default 2000
  timeoutMs?: number;  // default 30000
  onPoll: (conversation: OnboardingConversation) => void;  // ← new: called on every response
  onSuccess: (conversation: OnboardingConversation) => void;
  onTimeout: () => void;
}

export function useOnboardingPolling(opts: UseOnboardingPollingOptions): void
```

`onPoll` is called on every successful GET response (including those where message count hasn't changed yet), allowing the consumer to update `isTyping` state from the latest response.

Internally uses `useEffect` with cleanup. Tracks elapsed time to enforce timeout.

---

## Sequence Diagram

```
User types message → handleTextSend()
  POST /onboarding/messages → 202 { status: 'pending', userMessageId }
  setComposerState('awaiting-reply')
  [typing bubble shown optimistically]

  ← polling starts →
  t=0s: GET /onboarding/messages → { messages: [user], isTyping: false }
        → onPoll: setIsTypingFromServer(false) [Redis not set yet / timing]
  t=2s: GET /onboarding/messages → { messages: [user], isTyping: true }
        → onPoll: setIsTypingFromServer(true) [typing bubble confirmed]
  t=4s: GET /onboarding/messages → { messages: [user, assistant], isTyping: false }
        → count increased → onSuccess, stop polling
        → setMessages([user, assistant]), setComposerState('idle')
  [assistant bubble appears]

— OR —

  t=30s: no reply
  → setComposerState('idle'), setError('No reply received. Please try again.')
  [error banner + retry button]
  → retry restores draft and re-sends
```

---

## Risks and Trade-offs

1. **Polling load:** With 2s interval during an active session, each user generates ~15 requests per 30s window. At current low scale this is not a concern. Could increase interval to 3s if needed.

2. **Stale message on retry:** If the backend processed the message but the frontend timed out, retry will re-send and create a duplicate. Mitigation: on retry, do a fresh `GET /onboarding/messages` first to check if the reply actually arrived before re-sending. This is a follow-up improvement; current spec accepts the simpler retry.

3. **`onboarding.step` from polling vs. from POST response:** The frontend previously read `response.onboarding.step` immediately after POST. Now it reads it from the last successful poll. This is correct since step changes (e.g., `complete`) happen when the assistant finishes processing — which now happens async.

4. **Audio messages:** Audio transcription happens sync (before 202 is returned), so `sending-audio` state still takes the same time as before. Only the AI processing is deferred. The transition is: `sending-audio` → 202 returned → `awaiting-reply` → poll for assistant reply.
