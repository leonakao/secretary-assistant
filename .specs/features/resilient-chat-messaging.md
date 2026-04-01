# Resilient Chat Messaging

## Problem Definition

### 1. WhatsApp — Premature Replies (User Still Typing)

**Current behavior:** Every webhook from Evolution API triggers `IncomingMessageUseCase` immediately. The AI generates and sends a reply before the user has finished their thought.

**User impact:** Customers who send a greeting followed quickly by a question receive two separate AI responses — one for the greeting alone, one for the actual question — breaking the conversational flow and making the assistant feel robotic.

**Root cause:** The webhook handler (`EvolutionWebhookController`) calls the use case synchronously per message with no buffering window.

---

### 2. Web Chat / Onboarding Chat — Response Lost on Refresh

**Current behavior:** `POST /onboarding/messages` waits for the full AI response (~2–5s) before returning. If the user refreshes the page mid-request, the HTTP connection is dropped, the response is lost, and the UI reloads into an inconsistent state (user message may have been saved, assistant reply is gone).

**User impact:** During onboarding — a high-stakes first-run flow — a page refresh forces the user to re-send their last message. In the worst case, they see their message in the chat but no reply, leaving them confused about whether the assistant is broken. This same fragility applies to any future web chat interface.

---

## Architecture Overview

All incoming messages — regardless of channel — flow through a **single shared pipeline**:

```
Incoming message (any channel)
        │
        ▼
  Enqueue to message_queue table (PostgreSQL)
  Return immediately (200/202)
        │
        ▼
  NestJS @Interval scheduler (every 5s)
  acquires Redis distributed lock
        │
        ▼
  Find ready queue items (debounce window elapsed)
  Group by conversation key
        │
        ▼
  Route by channel field → strategy
  (whatsapp → Evolution API reply)
  (web_chat → persist to DB, frontend polls)
        │
        ▼
  Mark queue item processed
```

**Channel values:** `whatsapp` | `web_chat`

This design ensures the debounce window and resilience pattern are consistent across all current and future conversation types.

---

## Infrastructure

### Queue: PostgreSQL `message_queue` table

Messages are stored in a new `message_queue` table in the existing Postgres database. No additional queue service is needed.

**Schema (conceptual):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | UUID | FK to companies |
| `conversation_key` | VARCHAR | Unique key per conversation (e.g. `whatsapp:{companyId}:{phone}`, `web_chat:{companyId}:{userId}`) |
| `channel` | ENUM | `whatsapp` \| `web_chat` |
| `messages` | JSONB | Ordered array of accumulated message payloads |
| `status` | ENUM | `pending` \| `processing` \| `done` \| `failed` |
| `enqueued_at` | TIMESTAMP | Time of first message in this batch |
| `last_message_at` | TIMESTAMP | Updated on each new message — used to compute debounce window |
| `processed_at` | TIMESTAMP | Nullable, set when done |

**Debounce logic:** A queue item is "ready" when `NOW() - last_message_at >= WHATSAPP_DEBOUNCE_MS`. New messages for the same `conversation_key` while status is `pending` append to the `messages` JSONB array and update `last_message_at`, resetting the clock.

### Distributed Lock: Redis (free tier)

Redis is used **only for distributed locking** — to prevent multiple NestJS instances from processing the same queue item simultaneously. The queue data itself lives in Postgres.

A lightweight Redis free tier instance ($0/month, 25 MB) is sufficient. `REDIS_URL` must be added to environment config.

Lock key: `queue-lock:{queueItemId}` — acquired before processing, released after.

### Scheduler: NestJS `@Interval`

A `@Interval`-decorated service method runs every 5 seconds inside the API process. It queries the `message_queue` table for items where:
- `status = 'pending'`
- `last_message_at <= NOW() - WHATSAPP_DEBOUNCE_MS`

For each ready item, it acquires the Redis lock and processes it.

---

## Debounce

- **Window:** 10 seconds (env var `WHATSAPP_DEBOUNCE_MS`, default `10000`)
- **Scope:** Global — all conversation types and channels use the same window
- **Audio messages:** Included in the debounce batch with no special handling. Transcription happens at processing time, not at enqueue time.
- **Message accumulation:** Messages within the batch are joined in order and passed to the strategy as a single composed input (e.g., `"Hello\n\nI want to know the price of the blue dress"`).

---

## Channel Routing

The `channel` field on each queue item determines how the processed reply is delivered:

| Channel | Input source | Reply mechanism |
|---|---|---|
| `whatsapp` | Evolution API webhook | Send reply via Evolution API |
| `web_chat` | HTTP POST (owner or future client web chat) | Persist reply to DB; frontend polls |

The `conversation_key` format encodes the channel and enough context to route to the correct strategy:
- WhatsApp: `whatsapp:{companyId}:{phone}`
- Web chat: `web_chat:{companyId}:{userId}`

---

## Onboarding Chat Consistency

The onboarding chat (`POST /onboarding/messages`) is kept on its own endpoint but must follow the same pattern:

1. Save user message immediately, enqueue processing, return `202 { status: 'pending', userMessageId }`.
2. Background processing runs the onboarding strategy, persists the assistant reply.
3. Frontend polls `GET /onboarding/messages` every 2 seconds until the reply appears or a 30-second timeout is hit.

The onboarding flow does not use the shared `message_queue` table (it has its own session model), but the HTTP contract and frontend polling pattern are consistent with `web_chat`.

---

## Acceptance Criteria

### Queue & Scheduler (shared pipeline)

- [ ] All incoming messages are saved to the `message_queue` table before the HTTP response is returned
- [ ] The webhook/HTTP handler always returns quickly (200/202) — no synchronous AI processing
- [ ] The NestJS scheduler runs every 5 seconds and picks up ready queue items
- [ ] A Redis lock is acquired per queue item before processing; concurrent instances skip locked items
- [ ] A queue item is only marked "ready" once `last_message_at` is at least `WHATSAPP_DEBOUNCE_MS` ms in the past
- [ ] `WHATSAPP_DEBOUNCE_MS` defaults to 10000 and can be overridden via environment variable

### WhatsApp Channel

- [ ] A message sent by a contact saves to the queue and returns `200` immediately; webhook token validation still applies
- [ ] A second message from the same contact within the debounce window appends to the existing queue item and resets `last_message_at`
- [ ] A second message arriving after the window has already been processed creates a new queue item
- [ ] After the window closes, the AI receives all accumulated messages as a single joined input and sends one reply via Evolution API
- [ ] Messages from different contacts (different `conversation_key`) are debounced independently
- [ ] Audio messages are accumulated in the batch; transcription occurs at processing time
- [ ] Processing failures are logged; the contact receives no reply (silent failure acceptable for now)

### Web Chat Channel

- [ ] `POST` to the web chat endpoint saves the user message and enqueues processing; returns `202 { status: 'pending', userMessageId }` immediately
- [ ] The assistant reply is persisted to DB once the scheduler processes the item, regardless of whether the frontend connection is still open
- [ ] Submitting a new message while a queue item is `pending` or `processing` for the same conversation returns `409 Conflict`
- [ ] The `channel` field on the queue item is `web_chat`; the scheduler routes to the correct strategy accordingly

### Onboarding Chat Resilience (consistent pattern)

- [ ] `POST /onboarding/messages` returns `202 { status: 'pending', userMessageId }` within ~100ms
- [ ] The user message is persisted immediately and visible on refresh before the reply arrives
- [ ] On page load after a refresh, already-persisted messages (including a completed assistant reply) are shown immediately
- [ ] Frontend polls `GET /onboarding/messages` every 2 seconds while waiting for the assistant reply
- [ ] Polling stops once the reply appears or after 30 seconds
- [ ] If no reply arrives within 30 seconds, an error banner is shown with a retry option

---

## Out of Scope

- **WhatsApp message ordering guarantees** across concurrent webhook deliveries from Evolution API — order is assumed to be roughly correct
- **Streaming / partial AI output** for any interface
- **Read receipts or typing indicators** sent back to WhatsApp contacts
- **Retry logic for failed AI calls** — silent failure is accepted for now
- **Multi-device / multi-tab sync** for web chat
- **Rate limiting** on polling endpoints (low traffic, not a concern yet)
- **Per-company configurable debounce window** — global env var is sufficient for now

---

## Open Questions

1. **Onboarding polling interval:** 2 seconds is a reasonable poll frequency. Is there a concern about API load during an active onboarding session?
2. **`web_chat` scope:** The web chat channel is included in the architecture from day one, but no web chat UI exists yet for owner conversations. Should the API endpoint be stubbed/documented now, or deferred until the UI is built?
