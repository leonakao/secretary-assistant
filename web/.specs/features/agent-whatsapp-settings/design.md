# Agent WhatsApp Settings - Web Design

## Overview

The web side of this feature should replace the current settings placeholder with the first real version of the authenticated settings page.

This delivery ships only one settings category: WhatsApp connection management. The page, however, must already be structured as a settings surface with clear section boundaries so future categories can be added without redesigning the WhatsApp section from scratch.

The page must present two independent state dimensions:

1. WhatsApp connection status
2. Agent operational status (`on` / `off`)

For v1, the operational toggle should be presented in owner-facing language as an agent state control, while the underlying semantics remain "automatic client replies enabled/disabled".

## Existing Anchors

- `web/app/routes/app.settings.tsx`
- `web/app/modules/settings/pages/settings-page/index.tsx`
- `web/app/modules/company/pages/company-page/index.tsx`
- `web/app/lib/api.client.ts`
- `web/app/modules/company/api/company.api.ts`

## Design Goals

1. Replace the placeholder with a real settings experience.
2. Make the page extensible so WhatsApp is clearly the first section, not the whole future settings system.
3. Keep connection controls and the agent on/off toggle visually and behaviorally separate.
4. Keep the page shippable in narrow, testable steps.
5. Normalize provider-oriented states into clear owner-facing copy.

## Data Contract Adoption

Recommended settings API wrapper:

```ts
type ManagedWhatsAppConnectionStatus =
  | 'not-provisioned'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unknown';

interface ManagedWhatsAppSettings {
  companyId: string;
  evolutionInstanceName: string | null;
  hasProvisionedInstance: boolean;
  connectionStatus: ManagedWhatsAppConnectionStatus;
  agentEnabled: boolean;
}

interface ManagedWhatsAppConnectionPayload {
  qrCodeBase64: string | null;
  pairingCode: string | null;
  expiresAt: string | null;
}
```

Recommended wrappers:

- `getManagedWhatsAppSettings()`
- `provisionManagedWhatsAppInstance()`
- `getManagedWhatsAppConnectionPayload()`
- `refreshManagedWhatsAppStatus()`
- `updateManagedAgentState()`
- `disconnectManagedWhatsApp()`

## Page Structure

Recommended page sections:

### Section 1: Settings Header

- page heading and short explanation
- copy that frames WhatsApp as the first settings category

### Section 2: WhatsApp Settings Shell

- a dedicated card/section for the WhatsApp category
- local loading, success, and error handling for its actions

### Section 3: Connection Status Summary

- status badge and explanatory text
- current instance identifier when provisioned
- distinction between:
  - `not provisioned`
  - `disconnected`
  - `connecting`
  - `connected`
  - `unknown`

### Section 4: Agent Operational Toggle

- explicit `Ligado` / `Desligado` state
- explanatory copy clarifying that this does not disconnect WhatsApp
- action button or switch with local pending/error feedback

### Section 5: Connection Actions

Actions should render conditionally by settings state:

- `Provisionar conexão` when `not-provisioned`
- `Conectar WhatsApp` when provisioned but not connected
- `Atualizar status` when QR was shown or when the owner needs a refresh
- `Desconectar WhatsApp` when connected or reconnectable

### Section 6: Connection Payload Viewer

- appears only after the owner explicitly requests connection data
- renders QR code when available
- renders pairing code text when available
- includes retry/refresh affordance

## Component Shape

Recommended file/module structure:

- `web/app/routes/app.settings.tsx`
- `web/app/modules/settings/api/settings.api.ts`
- `web/app/modules/settings/pages/settings-page/index.tsx`
- `web/app/modules/settings/components/settings-page-skeleton.tsx`
- `web/app/modules/settings/components/settings-section-shell.tsx`
- `web/app/modules/settings/components/whatsapp-settings-card.tsx`
- `web/app/modules/settings/components/whatsapp-connection-status.tsx`
- `web/app/modules/settings/components/agent-operational-toggle.tsx`
- `web/app/modules/settings/components/whatsapp-connection-payload.tsx`

Reasoning:

- the route stays thin
- the page owns initial data load and refresh coordination
- WhatsApp-specific UI stays isolated inside one category card
- reusable section shell prepares the page for future categories

## State Model

Recommended page state:

- `settings`
- `isLoading`
- `loadError`
- `connectionPayload`
- `isProvisioning`
- `isRefreshingStatus`
- `isFetchingConnectionPayload`
- `isDisconnecting`

Recommended local toggle state:

- `isUpdatingAgentState`
- `agentStateError`

Rules:

- the connection payload should be cleared when the page re-enters `not-provisioned`
- toggle actions must not wipe the connection payload viewer
- disconnect should not implicitly force the toggle back to `on`

## UX Rules

- the owner must never confuse `Desligar agente` with `Desconectar WhatsApp`
- each action should have local pending text or disabled states
- the page must remain useful for legacy companies with no instance
- provider failures should be recoverable in place
- future settings categories should be addable as siblings to the WhatsApp section rather than as special cases inside it

## Copy and Status Mapping

Recommended product-facing mapping:

- `not-provisioned` -> `WhatsApp ainda não configurado`
- `disconnected` -> `WhatsApp desconectado`
- `connecting` -> `Aguardando conexão`
- `connected` -> `WhatsApp conectado`
- `unknown` -> `Status indisponível`

Operational toggle copy:

- `Ligado` -> assistant responds automatically to customers
- `Desligado` -> assistant stays paused but WhatsApp may remain connected

## Testing Strategy

Preferred web coverage:

- page loads managed settings and replaces placeholder content
- extensible settings shell remains visible even when WhatsApp is not provisioned
- provisioning action updates the page to a provisioned state
- connection payload appears only after explicit request
- toggle updates operational state without clearing connection state
- disconnect updates connection state without mutating operational state
- recoverable errors preserve the current local view model

Test levels:

- API wrapper tests for endpoint contracts
- component/page tests for the main settings interactions

## Risks

- If the page mixes toggle state and connection state too aggressively, the owner will not understand what each action does. The mitigation is distinct components and explicit copy.
- QR/pairing payloads may vary by provider response. The UI should render optional fields and avoid assuming both always exist.
- If the page becomes WhatsApp-specific in layout, future settings categories will require rework. The mitigation is a reusable settings-section shell from the first delivery.

