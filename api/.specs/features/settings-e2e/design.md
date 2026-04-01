# Settings E2E - API Design

## Overview

This delivery requires backend support so the `/app/settings` E2E suite can validate both:

- persisted settings returned by the real API
- assistant reply behavior when webhook events hit the API

The API work is not a new product surface created only for tests. It is the contract that the current settings page already depends on and that the E2E suite must prove end to end.

## Affected Area

- `api/src/modules/companies/`
- `api/src/modules/chat/`
- `api/src/database/migrations/`
- controller and use-case tests for settings endpoints and webhook behavior

## Required Backend Capabilities

### 1. Managed settings contract

The API must expose deterministic owner-facing settings data through:

- `GET /companies/me/whatsapp-settings`
- `POST /companies/me/whatsapp-instance`
- `POST /companies/me/whatsapp-connection`
- `POST /companies/me/whatsapp-refresh`
- `POST /companies/me/agent-state`
- `POST /companies/me/agent-reply-settings`
- `POST /companies/me/whatsapp-disconnect`

The `whatsapp-settings` response must include:

- WhatsApp provisioning and connection state
- agent enabled/disabled state
- reply-scope fields for `all` and `specific`

### 2. Persistence model for reply eligibility

The company entity must persist the reply-eligibility fields needed by the settings page and webhook behavior:

- `agentReplyScope`
- `agentReplyNamePattern`
- `agentReplyListMode`
- `agentReplyListEntries`

This requires:

- entity fields on `Company`
- migration coverage for existing databases
- response mapping in the managed settings use case
- input validation and persistence in the update reply-settings use case

### 3. Runtime enforcement in webhook flow

`IncomingMessageUseCase` must apply the saved company settings before invoking the client assistant strategy.

Required behavior:

- disabled agent returns no reply
- `all` replies to eligible client contacts
- `specific + name pattern` replies only when the contact matches
- `specific + whitelist` replies only when the contact matches
- `specific + blacklist` blocks when the contact matches
- `specific` with no filters returns no reply

The filtering decision belongs in the backend because the E2E suite validates the real webhook/API behavior, not only UI payloads.

## Integration Strategy

### Settings page E2E dependency

The browser suite in `web/` may mock the settings endpoints, but the API-level E2E must use the real backend contract. That means the API design must stay stable and explicit for:

- authenticated owner settings requests
- webhook requests that simulate Evolution

### Onboarding-validation dependency

The API behavior suite uses the isolated onboarding-validation stack. The backend must therefore support:

- deterministic seeded companies and contacts
- deterministic authenticated owner access through the existing E2E auth mode
- webhook execution without requiring a live Evolution session for negative cases

Positive reply cases may still depend on outbound AI or Evolution integrations unless those dependencies are stubbed at the stack level.

## Test Impact

The API must have targeted automated coverage for:

- controller contract for `agent-reply-settings`
- settings retrieval including reply-settings fields
- persistence use case for reply settings
- webhook decision logic in `IncomingMessageUseCase`

These tests are the safety net beneath the Playwright suite and should isolate product regressions from E2E flakiness.

## Risks

- The feature now affects both `web` and `api`; treating it as web-only leaves the delivery under-specified.
- Real positive webhook replies may remain nondeterministic if they still depend on external AI or Evolution behavior.
- Connection-state mapping from Evolution responses must stay tolerant to payload shape variations, or the settings UI will expose unstable states.
