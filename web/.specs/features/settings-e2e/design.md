# Settings E2E - Web Design

## Overview

This delivery adds a hybrid end-to-end test strategy for `/app/settings`.

The suite is intentionally split across two testing layers:

- UI layer with Playwright browser automation and stateful HTTP mocks
- functional API layer using the real onboarding-validation API plus webhook calls that simulate Evolution

This split keeps the page coverage broad and deterministic while still proving that the saved settings affect assistant behavior in the backend.

## Affected Area

- `web/tests/e2e/`
- optional support helpers under `web/tests/e2e/support/`
- no product code changes are expected by design
- if bugs are found during implementation, they must be routed to `software-engineer`
- this suite depends on stable backend support in `api/` for reply-settings persistence and webhook filtering behavior

## Test Strategy

### 1. UI E2E

Primary file:

- `web/tests/e2e/settings-page.spec.ts`

Support files:

- `web/tests/e2e/support/settings-mocks.ts`
- `web/tests/e2e/support/settings-auth.ts`
- `web/tests/e2e/support/settings-snapshots.ts`

Purpose:

- validate the full page rendering
- assert settings payloads emitted by the browser
- model state transitions for WhatsApp and reply-rule changes
- generate screenshots of the delivered UI

The browser suite will intercept and fulfill:

- `GET /users/me`
- `GET /companies/me/whatsapp-settings`
- `POST /companies/me/whatsapp-instance`
- `POST /companies/me/whatsapp-connection`
- `POST /companies/me/whatsapp-refresh`
- `POST /companies/me/agent-state`
- `POST /companies/me/agent-reply-settings`
- `POST /companies/me/whatsapp-disconnect`

The mock layer should be stateful so one scenario can:

- start as `not-provisioned`
- become `connecting`
- move to `connected`
- disconnect back to `disconnected`
- preserve reply settings across reloads

### 2. API Behavior E2E

Primary file:

- `web/tests/e2e/settings-api-integration.spec.ts`

Support files:

- `web/tests/e2e/support/settings-db.ts`
- `web/tests/e2e/support/settings-api.ts`
- `web/tests/e2e/support/settings-auth.ts`

Purpose:

- validate the runtime effect of saved settings without depending on UI mocks
- use Playwright `request` against the onboarding-validation API
- simulate Evolution by calling:
  - `POST /webhooks/evolution/:companyId/messages-upsert`

The functional suite should:

- seed user, company, user-company, and contact records
- update settings through the real API
- call the webhook with message payloads representing different contacts
- assert whether the API returns an assistant message or an empty one

## Authentication

Use the existing deterministic E2E auth contract already supported by the stack.

Browser and `request` helpers should share a small utility that can:

- build a deterministic bearer token
- prepare a matching authenticated owner identity

This keeps UI and API tests aligned to the same company identity.

## Visual Artifacts

Visual artifacts must not be written into committed source paths.

Required decision:

- store all screenshots and extra visual evidence under a dedicated folder such as:
  - `.artifacts/settings-e2e/`

That folder must be added to `.gitignore` during implementation before screenshots are produced.

Suggested screenshot names:

- `settings-initial.png`
- `settings-whatsapp-not-provisioned.png`
- `settings-whatsapp-connecting.png`
- `settings-whatsapp-connected.png`
- `settings-agent-disabled.png`
- `settings-reply-scope-specific.png`
- `settings-whitelist.png`
- `settings-blacklist.png`

The helper should standardize:

- file naming
- target directory
- optional test attachments

## Scenario Matrix

### UI scenarios

- page shell renders with all current sections
- new company loads with agent disabled
- connect action provisions missing instance and loads payload
- refresh transitions the state to connected
- disconnect keeps provisioned instance but updates connection state
- agent toggle updates only operational state
- reply scope can be saved as `all`
- reply scope can be saved as `specific`
- name pattern can be saved
- whitelist can be saved
- blacklist can be saved
- specific mode without filters shows warning
- reload shows persisted values
- local action errors remain recoverable

### API behavior scenarios

- disabled agent does not reply
- `all` replies
- `specific + name pattern` replies only on match
- `specific + whitelist` replies only on match
- `specific + blacklist` blocks on match
- `specific` with no filters blocks automatic replies

## Risks

- The QR canvas implementation emits jsdom warnings in unit tests; E2E browser screenshots should still be stable, but helper logic should avoid making visual assertions depend on canvas internals.
- The hybrid strategy depends on seed helpers being deterministic and isolated.
- If the webhook path reveals a product bug, the fix must go to `software-engineer`, not the test author by default.
