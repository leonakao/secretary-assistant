# Agent WhatsApp Settings - API Tasks

**Design**: `.specs/features/agent-whatsapp-settings/design.md`
**Status**: Draft

## Execution Plan

```text
Phase 1 (Sequential - Persistence and Provider Surface):
  T1 -> T2

Phase 2 (Sequential - Settings Read and Recovery Contracts):
  T2 -> T3 -> T4

Phase 3 (Sequential - Connection and Operational Controls):
  T4 -> T5 -> T6 -> T7

Phase 4 (Sequential - Tests and Verification):
  T7 -> T8 -> T9
```

## Task Breakdown

### T1: Persist canonical Evolution instance linkage on `Company`

**What**: Add the company-level persistence needed to link one canonical Evolution instance to one company.
**Where**: `api/src/modules/companies/entities/company.entity.ts`, TypeORM migration
**Depends on**: None

**Done when**:
- [ ] `Company` has nullable `evolutionInstanceName`
- [ ] migration is safe for existing companies
- [ ] existing company reads/writes compile cleanly

### T2: Extend `EvolutionService` for instance lifecycle operations

**What**: Add provider wrappers for instance creation, connection payload retrieval, and logout, keeping output normalization at the API boundary.
**Where**: `api/src/modules/evolution/services/evolution.service.ts`
**Depends on**: T1

**Done when**:
- [ ] instance creation wrapper exists
- [ ] connection-payload wrapper exists
- [ ] logout wrapper exists
- [ ] existing status wrapper remains available

### T3: Add managed WhatsApp settings read contract

**What**: Expose an authenticated read endpoint for the current company's WhatsApp settings state.
**Where**: new `companies/me` controller + use-case(s)
**Depends on**: T2

**Done when**:
- [ ] endpoint returns `hasProvisionedInstance`, `evolutionInstanceName`, `connectionStatus`, and `agentEnabled`
- [ ] `not-provisioned` is returned without calling Evolution when the linkage is missing
- [ ] auth and no-company handling are explicit

### T4: Add canonical instance provisioning flow

**What**: Implement deterministic instance provisioning and wire it into both company creation and lazy recovery from settings.
**Where**: `create-onboarding-company.use-case.ts`, new provisioning use-case/service
**Depends on**: T3

**Done when**:
- [ ] company creation attempts provisioning after persisting the company
- [ ] provisioning failure does not roll back company creation
- [ ] legacy companies can provision from a dedicated endpoint
- [ ] duplicate provisioning is prevented for already-linked companies

### T5: Add connection payload and status refresh contracts

**What**: Expose narrow endpoints to request QR/pairing data and refresh connection status.
**Where**: new `companies/me` WhatsApp controller + use-cases
**Depends on**: T4

**Done when**:
- [ ] connection-payload endpoint exists
- [ ] refresh-status endpoint exists
- [ ] both endpoints reject `not-provisioned` companies predictably
- [ ] responses reuse the normalized settings shape

### T6: Add agent operational toggle contract

**What**: Expose an authenticated endpoint that toggles automatic client replies without affecting the WhatsApp session.
**Where**: new DTO + use-case under `api/src/modules/companies/`
**Depends on**: T3

**Done when**:
- [ ] endpoint accepts `enabled: boolean`
- [ ] endpoint updates `isClientsSupportEnabled`
- [ ] response returns the updated settings payload
- [ ] no WhatsApp disconnect side effect occurs

### T7: Add WhatsApp disconnect contract and chat-flow gating regression

**What**: Expose disconnect behavior and verify the runtime message flow honors the operational toggle semantics.
**Where**: new disconnect use-case/controller action, `incoming-message.use-case.ts` regression coverage
**Depends on**: T5, T6

**Done when**:
- [ ] disconnect endpoint exists
- [ ] disconnect preserves `evolutionInstanceName`
- [ ] disconnect does not mutate `isClientsSupportEnabled`
- [ ] client auto-replies remain blocked while the toggle is off

### T8: Add focused API tests

**What**: Cover provisioning, settings reads, connection actions, and operational toggle behavior.
**Where**: companies/onboarding/chat spec files
**Depends on**: T4, T5, T6, T7

**Done when**:
- [ ] provisioning success and failure at company creation are tested
- [ ] lazy provisioning is tested
- [ ] settings read states are tested
- [ ] toggle and disconnect separation is tested
- [ ] message gating regression is tested

### T9: Run API verification

**What**: Execute required project checks for the touched API code.
**Where**: `api/`
**Depends on**: T8

**Done when**:
- [ ] `pnpm lint` passes
- [ ] relevant tests pass
- [ ] `npx tsc --noEmit` is run and failures are classified as feature-specific or pre-existing

