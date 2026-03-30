# Agent WhatsApp Settings - Web Tasks

**Design**: `.specs/features/agent-whatsapp-settings/design.md`
**Status**: Draft

## Execution Plan

```text
Phase 1 (Sequential - Contracts and Page Shell):
  T1 -> T2

Phase 2 (Sequential - WhatsApp Status and Connection Actions):
  T2 -> T3 -> T4

Phase 3 (Sequential - Agent Toggle and Interaction Separation):
  T4 -> T5

Phase 4 (Sequential - Tests and Verification):
  T5 -> T6
```

## Task Breakdown

### T1: Add settings API wrappers and types

**What**: Add the API layer for WhatsApp settings management under the settings module.
**Where**: `web/app/modules/settings/api/settings.api.ts`
**Depends on**: None

**Done when**:
- [ ] wrapper exists for reading managed WhatsApp settings
- [ ] wrapper exists for provisioning an instance
- [ ] wrapper exists for requesting connection payload
- [ ] wrapper exists for refreshing status
- [ ] wrapper exists for updating agent operational state
- [ ] wrapper exists for disconnecting WhatsApp

### T2: Replace the placeholder with an extensible settings page shell

**What**: Convert the settings page into a real data-driven screen with a reusable section shell and explicit loading/error states.
**Where**: `web/app/modules/settings/pages/settings-page/index.tsx`, new settings components
**Depends on**: T1

**Done when**:
- [ ] page loads managed settings data
- [ ] loading and load-error states are explicit
- [ ] WhatsApp is rendered as the first settings section
- [ ] page structure is ready for future sibling settings categories

### T3: Add WhatsApp connection status and provisioning flow

**What**: Render the provisioned/not-provisioned state, current connection status, and the action to create a missing instance.
**Where**: WhatsApp settings components under `web/app/modules/settings/components/`
**Depends on**: T2

**Done when**:
- [ ] `not-provisioned` state is clearly represented
- [ ] provision action exists for legacy or failed-provisioning companies
- [ ] provision success refreshes the rendered settings state
- [ ] status copy maps provider-oriented states into product language

### T4: Add connect, refresh, and disconnect actions with payload viewer

**What**: Add the connect flow UI, including QR/pairing display, status refresh, and disconnect behavior.
**Where**: WhatsApp settings components under `web/app/modules/settings/components/`
**Depends on**: T3

**Done when**:
- [ ] connection payload is only shown after explicit action
- [ ] QR and pairing-code fields render when present
- [ ] refresh-status action updates the current connection state
- [ ] disconnect action updates the connection state without removing the provisioned instance view

### T5: Add agent on/off toggle with explicit separation from connection controls

**What**: Add the operational toggle UI and keep it visually separate from WhatsApp connection actions.
**Where**: `agent-operational-toggle.tsx` and settings page integration
**Depends on**: T4

**Done when**:
- [ ] current agent-enabled state is displayed
- [ ] owner can turn the agent on or off
- [ ] toggle action does not clear QR/payload view state
- [ ] toggle copy explicitly says that WhatsApp stays connected

### T6: Add focused web tests and run verification

**What**: Cover the settings page interactions and execute required web checks.
**Where**: settings API/component/page tests
**Depends on**: T5

**Done when**:
- [ ] page load and placeholder replacement are tested
- [ ] provisioning and connection-payload flow are tested
- [ ] operational toggle and disconnect separation are tested
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] relevant tests pass
