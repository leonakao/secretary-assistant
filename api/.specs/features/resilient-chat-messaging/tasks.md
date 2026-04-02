# Resilient Chat Messaging — API Tasks

Tasks are ordered by dependency. Complete infrastructure before behavior, behavior before refactors.

---

## Phase 1: Infrastructure

### Task 1 — Add new packages
**Files:** `api/package.json`, `api/pnpm-lock.yaml`
**What:** Install `ioredis`, `@types/ioredis` (dev), `@nestjs/schedule`
**Done when:** `import { Redis } from 'ioredis'` and `import { ScheduleModule } from '@nestjs/schedule'` compile without errors
**No dependencies**

---

### Task 2 — Create `MessageQueue` entity
**Files to create:**
- `src/modules/message-queue/entities/message-queue.entity.ts`

**What:** TypeORM entity with columns: `id` (UUID PK), `companyId` (UUID), `conversationKey` (varchar 512, indexed), `channel` (enum), `messages` (jsonb), `status` (enum, default pending), `enqueuedAt` (CreateDateColumn), `lastMessageAt` (timestamp tz), `processedAt` (timestamp tz, nullable)
**Enums:** `MessageQueueChannel { WHATSAPP = 'whatsapp', WEB_CHAT = 'web_chat' }` and `MessageQueueStatus { PENDING, PROCESSING, DONE, FAILED }`
**Done when:** Entity compiles, TypeORM can reference it in `forFeature()`
**Depends on:** Task 1

---

### Task 3 — Create `CreateMessageQueue` migration
**Files to create:**
- `src/database/migrations/1764570000000-CreateMessageQueue.ts`

**What:** Raw SQL migration that:
1. Creates `message_queue_channel_enum` and `message_queue_status_enum` postgres enums
2. Creates `message_queue` table matching the entity
3. Creates composite index `(conversation_key, status)` and partial index on `(status, last_message_at) WHERE status = 'pending'`
4. `down()` drops table and enums

**Done when:** `pnpm migration:run` inside docker applies the migration cleanly; `pnpm migration:revert` rolls it back
**Depends on:** Task 2

---

### Task 4 — Create `MessageQueueModule` skeleton
**Files to create:**
- `src/modules/message-queue/message-queue.module.ts`

**What:** Empty module with `TypeOrmModule.forFeature([MessageQueue])`. No providers yet — just registers the entity.
**Done when:** Module imports without errors; can be added to `AppModule`
**Depends on:** Task 2

---

### Task 5 — Register `ScheduleModule` and `MessageQueueModule` in `AppModule`
**Files to modify:**
- `src/app.module.ts`

**What:** Add `ScheduleModule.forRoot()` and `MessageQueueModule` to imports
**Done when:** App starts without errors
**Depends on:** Tasks 1, 4

---

### Task 6 — Create `RedisLockService`
**Files to create:**
- `src/modules/message-queue/services/redis-lock.service.ts`

**What:** `@Injectable()` service that:
- On `onModuleInit`: creates `ioredis.Redis` client from `REDIS_URL` env var; on connection error log a warning and set `redis = null` (do not throw)
- On `onModuleDestroy`: disconnects if connected
- `acquireLock(key: string, ttlMs: number): Promise<boolean>` — if redis unavailable, log warning and return `true` (processing continues without lock); else SET NX PX, return true if acquired
- `releaseLock(key: string): Promise<void>` — if redis unavailable, no-op; else DEL key

**Done when:** Unit tests cover: (1) normal acquire/release, (2) Redis unavailable → `acquireLock` returns true, (3) concurrent acquire returns false for second caller
**Depends on:** Task 1

---

### Task 6b — Create `ChatStateService`
**Files to create:**
- `src/modules/message-queue/services/chat-state.service.ts`

**What:** `@Injectable()` service that manages a per-conversation typing indicator in Redis:
- Maintains its own `ioredis.Redis` connection (same pattern as `RedisLockService`)
- `setTyping(conversationKey: string): Promise<void>` — SET `chat-state:{conversationKey}` `'typing'` EX 45; no-op if Redis unavailable
- `clearTyping(conversationKey: string): Promise<void>` — DEL `chat-state:{conversationKey}`; no-op if Redis unavailable
- `getState(conversationKey: string): Promise<'typing' | null>` — GET key, return `'typing'` or `null`; returns `null` if Redis unavailable

TTL: 45 seconds (auto-expiry if processing crashes before `clearTyping` is called)

**Done when:** Unit tests cover: (1) setTyping → getState returns 'typing', (2) clearTyping → getState returns null, (3) Redis unavailable → all methods no-op / return null
**Depends on:** Task 1

---

## Phase 2: Queue Services

### Task 7 — Create `MessageQueueService`
**Files to create:**
- `src/modules/message-queue/services/message-queue.service.ts`

**What:** `@Injectable()` with `@InjectRepository(MessageQueue)`:
- `enqueueWhatsapp(companyId, conversationKey, message)`: find existing `status=pending` item for key; if found append to `messages` JSONB and update `lastMessageAt`; if not found, insert new row
- `enqueueWebChat(companyId, conversationKey, message)`: throw `ConflictException` if `status IN ('pending','processing')` exists; else insert new row
- `findReadyItems(debounceMs)`: SELECT WHERE `status='pending' AND last_message_at <= NOW() - interval '${debounceMs} ms'`
- `markProcessing(id)`: UPDATE status='processing'
- `markDone(id)`: UPDATE status='done', processed_at=NOW()
- `markFailed(id)`: UPDATE status='failed', processed_at=NOW()

**Done when:** Unit tests cover upsert (append vs new) and conflict behavior
**Depends on:** Tasks 2, 3

---

### Task 8 — Extract `MessageTextExtractorService`
**Files to create:**
- `src/modules/message-queue/services/message-text-extractor.service.ts`

**What:** Move the `extractOrTranscribeMessage` logic from `IncomingMessageUseCase` into this standalone service. Method signature: `extract(payload: EvolutionMessagesUpsertPayload): Promise<string>`. Handles text messages and audio transcription (delegates to existing `AudioTranscriptionService`).

**Files to modify:**
- `src/modules/chat/use-cases/incoming-message.use-case.ts` — inject `MessageTextExtractorService`, delegate to it (keep private method as thin wrapper initially, or remove it)

**Done when:** `IncomingMessageUseCase` tests still pass; `MessageTextExtractorService` has its own unit tests
**Depends on:** Tasks 4, 5 (module wiring happens here)

---

### Task 9 — Create `WhatsappQueueProcessorService`
**Files to create:**
- `src/modules/message-queue/processors/whatsapp-queue-processor.service.ts`

**What:** `process(item: MessageQueue): Promise<void>`:
1. Parse `conversationKey` (`whatsapp:{companyId}:{phone}`) to extract `companyId` and `phone`
2. Cast `item.messages` as `QueuedWhatsappMessage[]`
3. For each message: call `MessageTextExtractorService.extract(msg.payload)`, skip empty
4. Join texts with `'\n\n'`
5. Take `instanceName` and `remoteJid` from first message
6. Call `evolutionService.sendPresence({ instanceName, remoteJid, presence: 'composing' })` — signal typing to contact
7. In a `try/finally`: call `IncomingMessageUseCase.execute(companyId, instanceName, firstPayload, joinedText)`
8. In `finally`: call `evolutionService.sendPresence({ instanceName, remoteJid, presence: 'paused' })` — always clears composing

**Files to also modify:**
- `src/modules/evolution/services/evolution.service.ts` — extend `presence` type to include `'paused'`

**Done when:** Unit test with two queued messages verifies joined text is passed to use case; test verifies `sendPresence('composing')` is called before and `sendPresence('paused')` after (even on error)
**Depends on:** Tasks 7, 8

---

### Task 10 — Create `WebChatQueueProcessorService` (stub)
**Files to create:**
- `src/modules/message-queue/processors/web-chat-queue-processor.service.ts`

**What:** `process(item: MessageQueue): Promise<void>`:
1. `chatStateService.setTyping(item.conversationKey)` — set typing indicator in Redis
2. In `try/finally`: log item id (stub — no AI processing yet)
3. In `finally`: `chatStateService.clearTyping(item.conversationKey)` — always clears

**Done when:** No errors thrown during scheduler run for web_chat items; typing key is set then cleared in Redis during processing
**Depends on:** Tasks 6b, 7

---

### Task 11 — Create `MessageQueueScheduler`
**Files to create:**
- `src/modules/message-queue/schedulers/message-queue.scheduler.ts`

**What:** `@Injectable()` with `@Interval(5000)` method `processQueue()`:
1. Read `WHATSAPP_DEBOUNCE_MS` from config (default 10000)
2. `findReadyItems(debounceMs)` — get pending items
3. For each: `acquireLock('queue-lock:{id}', 60_000)`; if not acquired skip
4. `markProcessing(id)` then `route(item)` then `markDone(id)`
5. On error: `markFailed(id)`, log error
6. `finally`: `releaseLock('queue-lock:{id}')`

**Done when:** Integration test triggers scheduler manually and verifies a seeded queue item gets processed and marked done; concurrent lock acquisition skips already-locked items
**Depends on:** Tasks 6, 9, 10

---

### Task 12 — Update `MessageQueueModule` with all providers
**Files to modify:**
- `src/modules/message-queue/message-queue.module.ts`

**What:** Register all providers from Tasks 6, 6b, 7–11, add `forwardRef(() => ChatModule)` and `AiModule` imports, export `MessageQueueService` and `ChatStateService`
**Done when:** App starts without circular dependency errors
**Depends on:** Tasks 6, 6b, 7–11

---

## Phase 3: WhatsApp Webhook Refactor

### Task 13 — Refactor `EvolutionWebhookController`
**Files to modify:**
- `src/modules/chat/controllers/evolution-webhook.controller.ts`
- `src/modules/chat/chat.module.ts` (swap IncomingMessageUseCase → MessageQueueService in providers/imports)

**What:**
- Remove `IncomingMessageUseCase` constructor injection
- Inject `MessageQueueService`
- In `handleMessages()`:
  - Extract phone: `'+' + data.key.remoteJid.split('@')[0]`
  - Build `conversationKey = 'whatsapp:' + companyId + ':' + phone`
  - Call `messageQueueService.enqueueWhatsapp(companyId, conversationKey, { instanceName: instance, payload: data })`
  - Return `{ success: true }` immediately
- Keep token validation unchanged

**Done when:** `EvolutionWebhookController` spec passes; manual test: two rapid webhook calls with same JID produce one queue row with two messages
**Depends on:** Task 12

---

### Task 14 — Update `IncomingMessageUseCase` for pre-extracted text
**Files to modify:**
- `src/modules/chat/use-cases/incoming-message.use-case.ts`

**What:** Add optional `preExtractedText?: string` parameter to `execute()`. If provided, skip `extractOrTranscribeMessage()` and use it as `messageText`. Remove inline `extractOrTranscribeMessage` body and delegate to injected `MessageTextExtractorService` for backward compat path.

**Done when:** Existing unit tests still pass; `WhatsappQueueProcessorService` can call `execute()` with `preExtractedText` and routing works correctly
**Depends on:** Task 8

---

## Phase 4: Web Chat Stub Endpoint

### Task 15 — Add `WebChatController`
**Files to create:**
- `src/modules/chat/controllers/web-chat.controller.ts`
- `src/modules/chat/dto/send-web-chat-message.dto.ts`

**What:** `POST /chat/messages` endpoint:
- Auth: `SessionGuard`
- DTO: `{ message: string; companyId: string }`
- Build `conversationKey = 'web_chat:' + dto.companyId + ':' + user.id`
- Call `messageQueueService.enqueueWebChat()`
- Return `HttpCode(202)` with `{ status: 'pending', userMessageId: item.id }`
- `ConflictException` propagated as 409

**Files to modify:**
- `src/modules/chat/chat.module.ts` — register `WebChatController`, import `MessageQueueModule`

**Done when:** `POST /chat/messages` returns 202 on first call, 409 on second call with same conversation key while pending
**Depends on:** Task 12

---

## Phase 5: Onboarding Chat Async Refactor

### Task 16 — Split `OnboardingConversationService.run()` and add ChatState
**Files to modify:**
- `src/modules/onboarding/services/onboarding-conversation.service.ts`
- `src/modules/onboarding/onboarding.module.ts` — import `MessageQueueModule` (for `ChatStateService`)

**What:** Add two new public methods:

**`saveUserMessage(userId, companyId, message): Promise<PersistedConversationMessage>`**
- Validates access (calls existing `loadConversationAccess`)
- Saves user message to memory via `memoryRepository.save()`
- Returns the persisted message

**`generateAndSaveAssistantReplyAsync(userId, companyId): Promise<void>`**
- Calls `chatStateService.setTyping('onboarding:{userId}:{companyId}')` at the start
- Calls existing `generateAssistantReply()` internally
- In `finally`: calls `chatStateService.clearTyping('onboarding:{userId}:{companyId}')`
- All errors caught and logged — never throws
- Designed to be called without `await`

Inject `ChatStateService` as a constructor dependency.

Keep existing `run()` method intact (it calls both steps sequentially). Tests that cover `run()` are not changed.

**Done when:** Unit tests for new methods pass; `run()` still passes existing tests; typing key is set and cleared around async reply generation
**Depends on:** Task 6b

---

### Task 17 — Refactor `SendOnboardingMessageUseCase` to return 202
**Files to modify:**
- `src/modules/onboarding/use-cases/send-onboarding-message.use-case.ts`

**What:**
- Change `execute()` return type to `{ status: 'pending'; userMessageId: string }`
- Step 1: resolve message text (same as before — transcription still sync for audio)
- Step 2: `onboardingConversationService.saveUserMessage(userId, companyId, messageText)`
- Step 3: fire `onboardingConversationService.generateAndSaveAssistantReplyAsync(userId, companyId)` — no await
- Step 4: return `{ status: 'pending', userMessageId: userMessage.id }`

**Done when:** Unit tests pass; POST returns within ~100ms in integration test (no AI latency)
**Depends on:** Task 16

---

### Task 18 — Update `OnboardingMessagesController` POST handler
**Files to modify:**
- `src/modules/onboarding/controllers/onboarding-messages.controller.ts`

**What:**
- Add `@HttpCode(202)` to `sendMessage()` handler
- Update return type annotation to `{ status: 'pending'; userMessageId: string }`

**Done when:** `POST /onboarding/messages` responds with HTTP 202
**Depends on:** Task 17

---

### Task 19 — Extend `GET /onboarding/messages` response with onboarding state and typing indicator
**Files to modify:**
- `src/modules/onboarding/use-cases/get-onboarding-messages.use-case.ts`

**What:**
- Include `onboarding: { requiresOnboarding: boolean; step: string }` — for completion detection during polling
- Include `isTyping: boolean` — resolved by calling `chatStateService.getState('onboarding:{userId}:{companyId}')`; `true` if result is `'typing'`, `false` otherwise (including when Redis is unavailable)

Inject `ChatStateService` as a constructor dependency.

**Done when:** `GET /onboarding/messages` response includes `onboarding.step` and `isTyping`; `isTyping` is `true` while `generateAndSaveAssistantReplyAsync` is running; existing test updated
**Depends on:** Tasks 6b, 16
