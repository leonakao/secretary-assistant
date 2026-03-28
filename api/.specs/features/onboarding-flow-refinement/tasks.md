# Onboarding Flow Refinement – API Tasks

**Design**: `.specs/features/onboarding-flow-refinement/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Domain Context):
  T1 -> T2 -> T3

Phase 2 (Sequential – Initialization Flow):
  T3 -> T4 -> T5

Phase 3 (Sequential – Audio Contract):
  T5 -> T6 -> T7 -> T8

Phase 4 (Sequential – State Contract + Regression):
  T8 -> T9 -> T10
```

---

## Task Breakdown

### T1: Persist `businessType` on `Company`

**What**: Add a durable `businessType` column to the company domain model and migration.
**Where**: `api/src/modules/companies/entities/company.entity.ts`, TypeORM migration
**Depends on**: None

**Done when**:
- [ ] `Company` has `businessType: string | null`
- [ ] Migration adds the column safely for existing data
- [ ] Existing reads/writes compile cleanly

### T2: Save `businessType` during bootstrap

**What**: Update onboarding company creation to persist the approved bootstrap field.
**Where**: `api/src/modules/onboarding/use-cases/create-onboarding-company.use-case.ts`
**Depends on**: T1

**Done when**:
- [ ] `dto.businessType` is saved on the new company record
- [ ] Existing idempotent bootstrap behavior remains unchanged
- [ ] Unit test covers persisted `businessType`

### T3: Extend onboarding agent context with company bootstrap data

**What**: Pass `company.name` and `company.businessType` into onboarding-agent execution.
**Where**: `api/src/modules/onboarding/services/onboarding-conversation.service.ts`, agent context types and prompt assembly
**Depends on**: T2

**Done when**:
- [ ] onboarding execution has access to `company.name`
- [ ] onboarding execution has access to `company.businessType`
- [ ] prompt instructions explicitly prevent re-asking for company name when known
- [ ] WhatsApp flow still compiles and uses the shared service safely

### T4: Add idempotent onboarding initialization use-case/service path

**What**: Introduce a transport-neutral `initializeThread` path in the onboarding conversation service.
**Where**: `api/src/modules/onboarding/services/onboarding-conversation.service.ts`
**Depends on**: T3

**Done when**:
- [ ] empty thread creates exactly one first assistant message
- [ ] non-empty thread returns without writing a duplicate message
- [ ] service enforces onboarding-only access and user/company relation checks
- [ ] unit tests cover empty thread, populated thread, and already-running company

### T5: Expose `POST /onboarding/messages/initialize`

**What**: Create controller/use-case endpoint for proactive step-2 initialization.
**Where**: new onboarding controller/use-case files under `api/src/modules/onboarding/`
**Depends on**: T4

**Done when**:
- [ ] authenticated request initializes a brand-new onboarding thread
- [ ] repeated request is idempotent
- [ ] response returns `initialized` and optional `assistantMessage`
- [ ] request does not change WhatsApp behavior

### T6: Extend audio transcription service to accept browser MIME type

**What**: Remove the hardcoded `audio/ogg` assumption and transcribe using request-provided MIME.
**Where**: `api/src/modules/ai/services/audio-transcription.service.ts`
**Depends on**: T5

**Done when**:
- [ ] transcription method accepts `(audioBase64, mimeType)`
- [ ] current callers are updated
- [ ] invalid/unsupported MIME produces recoverable domain error

### T7: Add multipart audio support to onboarding messages endpoint

**What**: Extend `POST /onboarding/messages` to accept text or multipart audio without durable file storage.
**Where**: onboarding controller, DTO/use-case files
**Depends on**: T6

**Done when**:
- [ ] text requests keep working
- [ ] multipart audio requests are accepted in memory
- [ ] raw audio is not written to disk or persisted in conversation history
- [ ] request validation distinguishes `kind=text` vs `kind=audio`

### T8: Return canonical `userMessage` and `assistantMessage` from message sends

**What**: Evolve the onboarding send response so the web can replace pending placeholders with persisted transcript entries.
**Where**: `api/src/modules/onboarding/use-cases/send-onboarding-message.use-case.ts` and response DTO typing
**Depends on**: T7

**Done when**:
- [ ] text send returns persisted `userMessage`
- [ ] audio send returns transcribed persisted `userMessage`
- [ ] assistant reply is still returned
- [ ] completion state remains accurate

### T9: Extend onboarding state response with initialization signal

**What**: Add `conversation.isInitialized` to `GET /onboarding/state`.
**Where**: `api/src/modules/onboarding/use-cases/get-onboarding-state.use-case.ts`
**Depends on**: T8

**Done when**:
- [ ] empty transcript returns `isInitialized: false`
- [ ] populated transcript returns `isInitialized: true`
- [ ] no-company flow still returns `conversation: null`

### T10: Add API tests and regressions

**What**: Cover the new onboarding initialization and audio behavior with unit/controller tests.
**Where**: onboarding service/use-case/controller spec files
**Depends on**: T9

**Done when**:
- [ ] bootstrap persists `businessType`
- [ ] initialize is idempotent
- [ ] first message uses stored company context
- [ ] audio send persists only transcribed text
- [ ] empty transcription leaves thread unchanged
- [ ] existing WhatsApp onboarding tests still pass
