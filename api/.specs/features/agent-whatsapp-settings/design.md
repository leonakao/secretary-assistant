# Agent WhatsApp Settings - API Design

## Overview

The API side of this feature should extend the existing `companies`, `onboarding`, `chat`, and `evolution` modules so the authenticated owner can manage one canonical WhatsApp connection per company from the settings screen.

This delivery should keep two state dimensions separate:

1. WhatsApp connection state in Evolution
2. Agent operational state inside Secretary Assistant

For v1, the API should keep the persisted company-to-instance linkage deterministic and local-first. The product should not try to discover or reconcile remote Evolution instances automatically.

## Existing Anchors

- `api/src/modules/companies/entities/company.entity.ts`
- `api/src/modules/companies/controllers/companies-me.controller.ts`
- `api/src/modules/companies/use-cases/get-managed-company.use-case.ts`
- `api/src/modules/onboarding/use-cases/create-onboarding-company.use-case.ts`
- `api/src/modules/evolution/services/evolution.service.ts`
- `api/src/modules/chat/use-cases/incoming-message.use-case.ts`
- `api/src/modules/chat/controllers/evolution-webhook.controller.ts`

## Design Goals

1. Persist one canonical Evolution instance name per company.
2. Provision that instance automatically during company creation when possible.
3. Preserve a lazy recovery path for legacy companies and transient provisioning failures.
4. Reuse the existing company-scoped auth model (`/companies/me`) instead of trusting browser-provided company IDs.
5. Keep WhatsApp connection lifecycle and agent enable/disable lifecycle separate in the API contract.
6. Ship in narrow steps that can be validated independently.

## Data Model

### Company persistence

Add one new nullable column to `Company`:

- `evolutionInstanceName: string | null`

Reasoning:

- a canonical instance name is enough to drive `status`, `connect`, and `logout`
- the webhook already identifies the company through the URL, so no extra lookup table is required for v1
- keeping the linkage on `Company` minimizes moving parts for the first release

### Agent operational toggle

For v1, reuse the existing `Company.isClientsSupportEnabled` flag as the operational toggle surfaced by settings.

Interpretation:

- `true`: automatic client-facing replies are enabled
- `false`: automatic client-facing replies are paused

Explicit scope for v1:

- this toggle gates automatic replies to client contacts
- owner and onboarding flows remain available
- no new persistence field is required for the toggle in this version

This keeps the schema delta focused on instance linkage only. If later product requirements broaden "agent on/off" beyond client support, the field can be renamed or replaced in a dedicated follow-up feature.

## Evolution Lifecycle Service

`EvolutionService` should be extended with explicit lifecycle methods:

- `createInstance(params)`
- `getConnectionPayload(instanceName)`
- `getInstanceStatus(instanceName)`
- `logoutInstance(instanceName)`

Recommended provider normalization:

```ts
type EvolutionConnectionStatus =
  | 'not-provisioned'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unknown';

interface ManagedWhatsAppSettingsResult {
  companyId: string;
  evolutionInstanceName: string | null;
  hasProvisionedInstance: boolean;
  connectionStatus: EvolutionConnectionStatus;
  agentEnabled: boolean;
}

interface WhatsAppConnectionPayloadResult {
  qrCodeBase64: string | null;
  pairingCode: string | null;
  expiresAt: string | null;
}
```

The controller/use-cases should return normalized product-facing fields, not raw Evolution payloads.

## Company Creation Integration

`CreateOnboardingCompanyUseCase` should attempt instance provisioning after the new company row is created.

Recommended ordering:

1. create company
2. create owner-company relation
3. try to create Evolution instance
4. if provisioning succeeds, persist `evolutionInstanceName`
5. if provisioning fails, keep company creation successful and leave settings in `not-provisioned` recovery state

Reasoning:

- company creation should remain usable even if Evolution is temporarily unavailable
- settings already provides the explicit retry path

## Settings Contracts

All contracts should stay under `companies/me` because they are owner-scoped and tied to the managed company.

### `GET /companies/me/whatsapp-settings`

Purpose:

- read the current settings state for the authenticated owner's managed company

Response:

```ts
interface GetManagedWhatsAppSettingsResponse {
  settings: {
    companyId: string;
    evolutionInstanceName: string | null;
    hasProvisionedInstance: boolean;
    connectionStatus:
      | 'not-provisioned'
      | 'disconnected'
      | 'connecting'
      | 'connected'
      | 'unknown';
    agentEnabled: boolean;
  };
}
```

Rules:

- `404` if the user has no managed company
- if `evolutionInstanceName` is null, return `not-provisioned` without calling Evolution
- if Evolution status read fails for a provisioned instance, return a predictable failure to the client rather than silently mutating linkage

### `POST /companies/me/whatsapp-instance`

Purpose:

- provision the missing canonical instance for legacy or failed-provisioning companies

Response:

- returns the same `settings` payload as the read endpoint

Rules:

- only allowed when `evolutionInstanceName` is null
- use a deterministic instance naming strategy derived from `company.id`
- duplicate requests must not create multiple linked instances

### `POST /companies/me/whatsapp-connection`

Purpose:

- request the current QR code or pairing payload for the canonical instance

Response:

```ts
interface GetManagedWhatsAppConnectionPayloadResponse {
  settings: ManagedWhatsAppSettingsResult;
  connectionPayload: {
    qrCodeBase64: string | null;
    pairingCode: string | null;
    expiresAt: string | null;
  };
}
```

Rules:

- `409` if the company has no provisioned instance yet
- if the instance is already connected, the endpoint may return no payload and the current connected status

### `POST /companies/me/whatsapp-refresh`

Purpose:

- re-read the current connection status after QR scan or retry

Response:

- returns the same `settings` payload as the read endpoint

### `POST /companies/me/agent-state`

Purpose:

- toggle automatic client replies without affecting the WhatsApp connection

Request:

```ts
interface UpdateManagedAgentStateRequest {
  enabled: boolean;
}
```

Response:

- returns the same `settings` payload as the read endpoint

Rules:

- updates `isClientsSupportEnabled`
- must not log out WhatsApp
- must not depend on the current connection state

### `POST /companies/me/whatsapp-disconnect`

Purpose:

- log out the current WhatsApp session while keeping the company linked to the same instance

Response:

- returns the same `settings` payload as the read endpoint

Rules:

- `409` if no provisioned instance exists
- must keep `evolutionInstanceName` unchanged
- must not mutate `isClientsSupportEnabled`

## Instance Naming Strategy

Use a deterministic canonical instance name derived from the company id, for example:

```ts
sa-company-{companyId}
```

Requirements:

- unique across companies
- stable across retries
- not dependent on mutable business fields like company name

This removes the need for random naming and simplifies idempotent provisioning.

## Module Shape

Recommended new API pieces:

- `api/src/modules/companies/dto/update-managed-agent-state.dto.ts`
- `api/src/modules/companies/controllers/companies-me-whatsapp.controller.ts`
- `api/src/modules/companies/use-cases/get-managed-whatsapp-settings.use-case.ts`
- `api/src/modules/companies/use-cases/provision-managed-whatsapp-instance.use-case.ts`
- `api/src/modules/companies/use-cases/get-managed-whatsapp-connection-payload.use-case.ts`
- `api/src/modules/companies/use-cases/refresh-managed-whatsapp-status.use-case.ts`
- `api/src/modules/companies/use-cases/update-managed-agent-state.use-case.ts`
- `api/src/modules/companies/use-cases/disconnect-managed-whatsapp.use-case.ts`
- `api/src/modules/companies/services/build-company-evolution-instance-name.service.ts`
- `api/src/modules/companies/services/map-managed-whatsapp-settings.service.ts`

`EvolutionService` additions:

- request body builder for instance creation, including the webhook URL for `POST /webhooks/evolution/:companyId/messages-upsert`
- connection payload mapping
- logout wrapper

## Chat Flow Changes

The incoming-message flow must explicitly respect the operational toggle.

Recommended v1 behavior:

- keep owner conversation handling unchanged
- keep onboarding conversation handling unchanged
- keep the existing client-support gate in `IncomingMessageUseCase`
- settings toggle writes to `isClientsSupportEnabled`

This aligns product behavior with current architecture:

- owner and onboarding traffic still works even when customer auto-replies are paused
- client auto-replies stop immediately when the toggle is off

## Validation Strategy

### DTO validation

- `UpdateManagedAgentStateDto.enabled`: required boolean

### Contract validation

- instance-provision endpoint returns `409` when the canonical instance is already linked
- connection-payload and disconnect endpoints return `409` when the company is still `not-provisioned`

## Testing Strategy

Add focused tests for:

- company creation success when instance provisioning succeeds
- company creation success when instance provisioning fails
- managed settings read with and without `evolutionInstanceName`
- lazy provisioning for legacy companies
- duplicate provisioning prevention
- connection payload request behavior
- disconnect behavior preserving `evolutionInstanceName`
- agent-state toggle behavior preserving WhatsApp connection linkage
- incoming-message gating when `isClientsSupportEnabled` is false

Preferred test levels:

- use-case tests first
- controller tests for auth and request/response shapes
- targeted regression tests for `CreateOnboardingCompanyUseCase` and `IncomingMessageUseCase`

## Risks

- Provisioning at company creation introduces an external provider dependency in a previously local-only flow. The mitigation is fail-open company creation plus lazy recovery.
- The current `isClientsSupportEnabled` name is narrower than the UI wording "agent on/off". The design mitigates this by documenting that v1 toggle semantics cover automatic client replies only.
- Evolution connection payload shapes may vary. The API layer should normalize them before exposing them to the web app.
- A mismatch between local linkage and remote Evolution state is intentionally out of scope for automated remediation in v1.

