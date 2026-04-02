# Resilient Chat Messaging — API Design

## Architecture Flow

```
WhatsApp webhook (POST /webhooks/evolution/:companyId/messages-upsert)
        │
        ▼
EvolutionWebhookController
  - validate token
  - build conversation_key = whatsapp:{companyId}:{phone}
  - MessageQueueService.enqueueWhatsapp() → upsert queue row
  - return 200 immediately (no AI processing)
        │
Web Chat (POST /chat/messages)
        │
        ▼
WebChatController
  - guard: 409 if pending/processing item exists for same key
  - MessageQueueService.enqueueWebChat() → insert queue row
  - return 202 { status: 'pending', userMessageId }
        │
        ▼
PostgreSQL message_queue table
        │
        ▼ (every 5s)
MessageQueueScheduler (@Interval)
  - query: status='pending' AND last_message_at <= NOW() - DEBOUNCE_MS
  - for each item: acquire Redis lock
        │
        ▼
QueueProcessorService
  - route by channel field
  - whatsapp → WhatsappQueueProcessorService
  - web_chat → WebChatQueueProcessorService (stub)
        │
        ▼
Mark item done/failed, release Redis lock
```

**Onboarding (separate path, same HTTP contract):**

```
POST /onboarding/messages
        │
        ▼
SendOnboardingMessageUseCase
  - resolve message text (transcribe audio if needed)
  - OnboardingConversationService.saveUserMessage() → persist to memory
  - fire OnboardingConversationService.generateAndSaveAssistantReplyAsync() (no await)
  - return 202 { status: 'pending', userMessageId }
        │
        ▼ (background)
OnboardingConversationService.generateAndSaveAssistantReplyAsync()
  - ChatStateService.setTyping('onboarding:{userId}:{companyId}')
  - run AI, persist assistant reply to memory
  - ChatStateService.clearTyping('onboarding:{userId}:{companyId}')
        │
        ▼
Frontend polls GET /onboarding/messages every 2s
  - response includes onboarding.step (completion detection) + isTyping (UX indicator)
```

---

## New Module: `message-queue`

Location: `src/modules/message-queue/`

### `MessageQueue` Entity

**File:** `src/modules/message-queue/entities/message-queue.entity.ts`

```typescript
export enum MessageQueueChannel {
  WHATSAPP = 'whatsapp',
  WEB_CHAT = 'web_chat',
}

export enum MessageQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('message_queue')
@Index(['conversationKey', 'status'])
export class MessageQueue {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) companyId: string;
  @Column({ type: 'varchar', length: 512 }) @Index() conversationKey: string;
  @Column({ type: 'enum', enum: MessageQueueChannel }) channel: MessageQueueChannel;
  @Column({ type: 'jsonb' }) messages: QueuedWhatsappMessage[] | QueuedWebChatMessage[];
  @Column({ type: 'enum', enum: MessageQueueStatus, default: 'pending' }) status: MessageQueueStatus;
  @CreateDateColumn() enqueuedAt: Date;
  @Column({ type: 'timestamp with time zone' }) lastMessageAt: Date;
  @Column({ type: 'timestamp with time zone', nullable: true }) processedAt: Date | null;
}
```

**JSONB message payload shapes:**

```typescript
// For whatsapp channel
interface QueuedWhatsappMessage {
  instanceName: string;
  payload: EvolutionMessagesUpsertPayload; // full raw webhook payload
}

// For web_chat channel
interface QueuedWebChatMessage {
  userId: string;
  text: string;
}
```

### Migration

**File:** `src/database/migrations/1764570000000-CreateMessageQueue.ts`

Raw SQL migration using `queryRunner.query()`:
- Creates `message_queue_channel_enum` and `message_queue_status_enum` Postgres enums
- Creates `message_queue` table with all columns
- Creates index on `(conversation_key, status)` and separate index on `conversation_key`

### `RedisLockService`

**File:** `src/modules/message-queue/services/redis-lock.service.ts`

Dependencies: `ioredis` (new package)

```typescript
@Injectable()
export class RedisLockService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;

  onModuleInit() { /* connect using REDIS_URL; on error: log warning, set redis = null */ }
  onModuleDestroy() { /* disconnect if connected */ }

  async acquireLock(key: string, ttlMs: number): Promise<boolean>
  // If redis unavailable: log warning, return true (no-op — processing continues)
  // Else: SET key 1 NX PX ttlMs → returns true if acquired

  async releaseLock(key: string): Promise<void>
  // If redis unavailable: no-op
  // Else: DEL key
}
```

Lock key format: `queue-lock:{queueItemId}`
TTL: 60 000 ms (60s — generous to cover AI processing time)

**Redis unavailability behavior:** If Redis is down or `REDIS_URL` is not set, `acquireLock` returns `true` and processing continues without a distributed lock. Safe for single-instance deployments. On multi-instance deployments during a Redis outage, double-processing is possible but acceptable.

### `ChatStateService`

**File:** `src/modules/message-queue/services/chat-state.service.ts`

Dependencies: `ioredis` (own Redis connection — separate from `RedisLockService` to avoid coupling)

```typescript
@Injectable()
export class ChatStateService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;

  onModuleInit() { /* connect using REDIS_URL; on error: log warning, set redis = null */ }
  onModuleDestroy() { /* disconnect if connected */ }

  // SET chat-state:{conversationKey} 'typing' EX 45
  // No-op if Redis unavailable
  async setTyping(conversationKey: string): Promise<void>

  // DEL chat-state:{conversationKey}
  // No-op if Redis unavailable
  async clearTyping(conversationKey: string): Promise<void>

  // GET chat-state:{conversationKey} → 'typing' | null
  // Returns null if Redis unavailable (graceful degradation)
  async getState(conversationKey: string): Promise<'typing' | null>
}
```

Redis key: `chat-state:{conversationKey}`
Value: `'typing'` (string)
TTL: 45 seconds — safety expiry so the key auto-clears if processing crashes before `clearTyping` is called.

**Redis unavailability behavior:** All methods are no-ops / return `null`. The `isTyping` field in API responses will always be `false` when Redis is down — the UX degrades gracefully (no typing bubble) but correctness is unaffected since polling still drives message detection.

### `MessageQueueService`

**File:** `src/modules/message-queue/services/message-queue.service.ts`

Dependencies: `Repository<MessageQueue>`

```typescript
@Injectable()
export class MessageQueueService {
  // Upsert for WhatsApp: append to existing pending item or create new
  async enqueueWhatsapp(
    companyId: string,
    conversationKey: string,
    message: QueuedWhatsappMessage,
  ): Promise<MessageQueue>

  // Insert for web_chat (throws ConflictException if pending/processing exists)
  async enqueueWebChat(
    companyId: string,
    conversationKey: string,
    message: QueuedWebChatMessage,
  ): Promise<MessageQueue>

  // Find items ready for processing
  async findReadyItems(debounceMs: number): Promise<MessageQueue[]>
  // WHERE status = 'pending' AND last_message_at <= NOW() - interval '${debounceMs} ms'

  async markProcessing(id: string): Promise<void>
  async markDone(id: string): Promise<void>
  async markFailed(id: string, error?: string): Promise<void>
}
```

### `MessageTextExtractorService`

**File:** `src/modules/message-queue/services/message-text-extractor.service.ts`

Extracts the `extractOrTranscribeMessage` logic from `IncomingMessageUseCase` into a standalone service.

Dependencies: `AudioTranscriptionService`

```typescript
@Injectable()
export class MessageTextExtractorService {
  async extract(payload: EvolutionMessagesUpsertPayload): Promise<string>
  // Mirrors existing IncomingMessageUseCase.extractOrTranscribeMessage()
}
```

This service is used by both `WhatsappQueueProcessorService` and `IncomingMessageUseCase` (which keeps a reference for backward compat with tests).

### `WhatsappQueueProcessorService`

**File:** `src/modules/message-queue/processors/whatsapp-queue-processor.service.ts`

Dependencies: `MessageTextExtractorService`, `IncomingMessageUseCase`, `EvolutionService`

```typescript
@Injectable()
export class WhatsappQueueProcessorService {
  async process(item: MessageQueue): Promise<void> {
    // 1. Parse conversationKey → { companyId, phone }
    // 2. For each QueuedWhatsappMessage in item.messages:
    //    - call MessageTextExtractorService.extract(msg.payload)
    //    - collect text strings (skip empty)
    // 3. joinedText = texts.join('\n\n')
    // 4. Take instanceName and remoteJid from first message
    // 5. Send "composing" presence: evolutionService.sendPresence({ instanceName, remoteJid, presence: 'composing' })
    // 6. Call IncomingMessageUseCase.execute(companyId, instanceName, firstPayload, joinedText)
    // 7. Send "paused" presence: evolutionService.sendPresence({ instanceName, remoteJid, presence: 'paused' })
    //    (in finally block — always clears composing even on failure)
  }
}
```

**Note:** `EvolutionService.sendPresence()` currently types `presence` as `'composing' | 'recording'`. The `'paused'` value must be added to the union type in `evolution.service.ts` to clear the composing indicator.

### `WebChatQueueProcessorService` (stub)

**File:** `src/modules/message-queue/processors/web-chat-queue-processor.service.ts`

Dependencies: `ChatStateService`

```typescript
@Injectable()
export class WebChatQueueProcessorService {
  async process(item: MessageQueue): Promise<void> {
    await this.chatStateService.setTyping(item.conversationKey);
    try {
      // No strategy implementation yet — stub logs and returns
      this.logger.log(`web_chat stub: processing item ${item.id}`);
    } finally {
      await this.chatStateService.clearTyping(item.conversationKey);
    }
  }
}
```

### `MessageQueueScheduler`

**File:** `src/modules/message-queue/schedulers/message-queue.scheduler.ts`

Dependencies: `MessageQueueService`, `RedisLockService`, `WhatsappQueueProcessorService`, `WebChatQueueProcessorService`, `ConfigService`

```typescript
@Injectable()
export class MessageQueueScheduler {
  private readonly debounceMs: number;
  // = configService.get('WHATSAPP_DEBOUNCE_MS', 10000)

  @Interval(5000)
  async processQueue(): Promise<void> {
    const items = await this.messageQueueService.findReadyItems(this.debounceMs);

    for (const item of items) {
      const lockKey = `queue-lock:${item.id}`;
      const acquired = await this.redisLockService.acquireLock(lockKey, 60_000);
      if (!acquired) continue; // another instance has it

      try {
        await this.messageQueueService.markProcessing(item.id);
        await this.route(item);
        await this.messageQueueService.markDone(item.id);
      } catch (error) {
        this.logger.error(`Failed processing queue item ${item.id}`, error);
        await this.messageQueueService.markFailed(item.id);
      } finally {
        await this.redisLockService.releaseLock(lockKey);
      }
    }
  }

  private async route(item: MessageQueue): Promise<void> {
    if (item.channel === MessageQueueChannel.WHATSAPP) {
      await this.whatsappProcessor.process(item);
    } else {
      await this.webChatProcessor.process(item);
    }
  }
}
```

### `MessageQueueModule`

**File:** `src/modules/message-queue/message-queue.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([MessageQueue]),
    ScheduleModule, // re-exported or imported here; actual forRoot() in AppModule
    forwardRef(() => ChatModule),
    AiModule,
  ],
  providers: [
    MessageQueueService,
    RedisLockService,
    ChatStateService,
    MessageTextExtractorService,
    WhatsappQueueProcessorService,
    WebChatQueueProcessorService,
    MessageQueueScheduler,
  ],
  exports: [MessageQueueService, ChatStateService],
})
export class MessageQueueModule {}
```

---

## New Endpoint: `POST /chat/messages` (web_chat stub)

**File:** `src/modules/chat/controllers/web-chat.controller.ts`

```typescript
@Controller('chat/messages')
export class WebChatController {
  @Post()
  @UseGuards(SessionGuard)
  @HttpCode(202)
  async sendMessage(
    @CurrentUser() user: User,
    @Body() dto: SendWebChatMessageDto,
  ): Promise<{ status: 'pending'; userMessageId: string }> {
    const conversationKey = `web_chat:${dto.companyId}:${user.id}`;
    const item = await this.messageQueueService.enqueueWebChat(
      dto.companyId,
      conversationKey,
      { userId: user.id, text: dto.message },
    );
    return { status: 'pending', userMessageId: item.id };
  }
}
```

DTO: `{ message: string; companyId: string }`

---

## Existing Files Changed

### `EvolutionWebhookController`

**Change:** Remove `IncomingMessageUseCase` dependency. Add `MessageQueueService`.

```typescript
@Post('/messages-upsert')
async handleMessages(...) {
  this.assertWebhookToken(evolutionToken);
  const { instance, data } = payload;
  const phone = '+' + data.key.remoteJid.split('@')[0];
  const conversationKey = `whatsapp:${companyId}:${phone}`;

  await this.messageQueueService.enqueueWhatsapp(companyId, conversationKey, {
    instanceName: instance,
    payload: data,
  });

  return { success: true };
}
```

### `IncomingMessageUseCase`

**Change:** Accept optional `preExtractedText` parameter to skip transcription when called from the scheduler.

```typescript
async execute(
  companyId: string,
  instanceName: string,
  payload: EvolutionMessagesUpsertPayload,
  preExtractedText?: string,  // ← new optional param
): Promise<ConversationResponse>
```

When `preExtractedText` is provided, use it directly instead of calling `extractOrTranscribeMessage`. The private `extractOrTranscribeMessage` delegates to `MessageTextExtractorService` (now injected instead of inline).

### `OnboardingConversationService`

**Change:** Split `run()` into two callable phases.

**New method:** `saveUserMessage(userId, companyId, message): Promise<PersistedConversationMessage>`
- Validates access, saves user message to memory, returns saved message.

**New method:** `generateAndSaveAssistantReplyAsync(userId, companyId): Promise<void>`
- Calls `chatStateService.setTyping('onboarding:{userId}:{companyId}')` at the start.
- Calls existing `generateAssistantReply()` internally.
- Calls `chatStateService.clearTyping(...)` in a `finally` block — always clears, even on error.
- All errors caught and logged — never throws.
- Designed to be called without `await`.

Dependencies added: `ChatStateService` (injected from `MessageQueueModule`)

**Keep `run()` intact** for backward compat with existing tests — it internally calls both new methods sequentially (or leave as-is for now; the use case is being replaced).

### `SendOnboardingMessageUseCase`

**Change:** Async pattern — no longer awaits AI reply.

```typescript
// Return type changes to:
interface SendOnboardingMessageResult {
  status: 'pending';
  userMessageId: string;
}

async execute(user, input): Promise<SendOnboardingMessageResult> {
  // 1. find userCompany (unchanged)
  // 2. resolve message text (unchanged — transcription still happens sync here)
  // 3. onboardingConversationService.saveUserMessage(userId, companyId, message)
  // 4. fire onboardingConversationService.generateAndSaveAssistantReplyAsync(userId, companyId)  // no await
  // 5. return { status: 'pending', userMessageId: userMessage.id }
}
```

**Note:** Audio transcription still happens synchronously before the 202 response. Only the AI call is deferred.

### `OnboardingMessagesController`

**Change:** Update POST handler HTTP status and return type.

```typescript
@Post()
@HttpCode(202)
async sendMessage(...): Promise<{ status: 'pending'; userMessageId: string }>
```

### `GetOnboardingMessagesUseCase`

**Change:** Include `onboarding` state and `isTyping` in response.

```typescript
// Response shape:
interface GetOnboardingMessagesResult {
  threadId: string | null;
  isInitialized: boolean;
  messages: PersistedConversationMessage[];
  onboarding: OnboardingStateResult['onboarding']; // ← new
  isTyping: boolean;                                // ← new
}
```

`isTyping` is resolved by calling `chatStateService.getState('onboarding:{userId}:{companyId}')` and checking if the result is `'typing'`. Returns `false` when Redis is unavailable.

Dependencies added: `ChatStateService` (injected from `MessageQueueModule`; `OnboardingModule` imports `MessageQueueModule`)

### `EvolutionService`

**File:** `src/modules/evolution/services/evolution.service.ts`

**Change:** Extend the `presence` type in `sendPresence()` to include `'paused'`:

```typescript
// Before:
presence?: 'composing' | 'recording'

// After:
presence?: 'composing' | 'recording' | 'paused'
```

`'paused'` signals to WhatsApp that the assistant has finished composing, clearing the typing indicator on the contact's device.

---

### `AppModule`

**Change:** Import `ScheduleModule.forRoot()` and `MessageQueueModule`.

```typescript
imports: [
  // ...existing...
  ScheduleModule.forRoot(),
  MessageQueueModule,
]
```

### `ChatModule`

**Change:** Register `WebChatController`. Import `MessageQueueModule` for `MessageQueueService`.

### `OnboardingModule`

**Change:** Import `MessageQueueModule` to make `ChatStateService` available to `GetOnboardingMessagesUseCase` and `OnboardingConversationService`.

---

## DB Schema (TypeORM entity → migration)

```sql
CREATE TYPE message_queue_channel_enum AS ENUM ('whatsapp', 'web_chat');
CREATE TYPE message_queue_status_enum AS ENUM ('pending', 'processing', 'done', 'failed');

CREATE TABLE message_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  conversation_key  VARCHAR(512) NOT NULL,
  channel           message_queue_channel_enum NOT NULL,
  messages          JSONB NOT NULL DEFAULT '[]',
  status            message_queue_status_enum NOT NULL DEFAULT 'pending',
  enqueued_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_message_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_message_queue_conversation_key_status
  ON message_queue (conversation_key, status);
CREATE INDEX idx_message_queue_status_last_message_at
  ON message_queue (status, last_message_at)
  WHERE status = 'pending';
```

Migration file timestamp: `1764570000000`

---

## New Packages Required

| Package | Purpose |
|---|---|
| `ioredis` | Redis client for distributed locking |
| `@types/ioredis` | TypeScript types (dev) |
| `@nestjs/schedule` | `@Interval` decorator support |

Check `package.json` first — none of these should be present yet.

---

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `REDIS_URL` | (required) | e.g. `redis://localhost:6379` |
| `WHATSAPP_DEBOUNCE_MS` | `10000` | Debounce window in milliseconds |

---

## Risks and Trade-offs

1. **Redis availability:** If Redis is down, `RedisLockService.acquireLock()` returns `true` and the scheduler processes items without a lock. Queue processing continues uninterrupted. On multi-instance deployments, double-processing is possible during an outage — acceptable trade-off.

2. **Onboarding audio still transcribed sync:** Audio transcription (Whisper API) can take 2–5s. The 202 response may be delayed for audio messages. This is acceptable — the spec does not require sub-100ms for audio.

3. **`run()` method kept on `OnboardingConversationService`:** Kept for backward compatibility with existing tests. Can be removed in a follow-up cleanup once tests are updated.

4. **`IncomingMessageUseCase` `preExtractedText` param:** Minor hack — if missed in a call path, the fallback is to re-transcribe (safe, just slow). Document clearly.

5. **No persistent error details on `message_queue.status = 'failed'`:** Silent failure per spec. A future task could add an `error_message` column.

6. **Scheduler concurrency with multiple instances:** Redis lock prevents double-processing but not starvation. Under heavy load, items may be delayed beyond 5s. Acceptable at current scale.

7. **`GET /onboarding/messages` response shape change:** Adding `onboarding` and `isTyping` fields is additive and backward-compatible, but the frontend must be updated simultaneously.

8. **`ChatStateService` Redis connection per service:** Both `RedisLockService` and `ChatStateService` open their own `ioredis` connections to the same Redis instance. Two connections per process is fine at current scale. A future cleanup could introduce a shared `RedisClientProvider` to avoid the duplication.

9. **WhatsApp `'paused'` presence:** Evolution API's behavior for `'paused'` presence depends on the WhatsApp integration layer. If Evolution API doesn't forward `paused` correctly, the composing indicator may not clear on the contact's device. Silent failure — no retry needed.
