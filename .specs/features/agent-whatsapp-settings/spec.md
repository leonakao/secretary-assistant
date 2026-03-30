# Agent WhatsApp Settings

## Summary

The authenticated app needs a real settings experience for the business owner to connect the AI agent to their WhatsApp account through Evolution API.

This delivery should establish the first real version of the broader app settings screen. In this feature, WhatsApp connection management is the only settings category delivered, but the screen must already be structured so future categories can be added without redesigning the page from scratch.

This feature introduces the first settings section, focused on WhatsApp connection management, where the owner can:

- view whether the agent already has an Evolution instance
- view the current WhatsApp connection status for that instance
- turn the agent on or off without disconnecting WhatsApp
- start or resume the connection flow
- retrieve the QR code or pairing payload required to link the customer's WhatsApp
- disconnect the current WhatsApp session when needed

The feature also establishes how Evolution instances are provisioned for each company:

- preferred behavior: create the Evolution instance when the company is created
- compatibility behavior: existing companies without an instance must still be able to provision one from the settings flow

This feature affects both `api/` and `web/`.

## Problem

Today the product can send messages through Evolution only when an `instanceName` is already known in the runtime context, but there is no end-user configuration flow for provisioning and connecting that instance.

Current gaps:

- the owner cannot see whether the company already has an Evolution instance
- the owner cannot see whether the agent is connected to WhatsApp
- there is no productized flow to create an Evolution instance for a company
- there is no settings UI to fetch the QR/pairing code and finish the WhatsApp connection
- legacy companies created before this feature have no guaranteed instance provisioning path
- the company lifecycle and WhatsApp lifecycle are not explicitly linked in the product

This blocks one of the product's core promises: a business owner should be able to connect their assistant to WhatsApp from the app without manual operator intervention.

## Goal

Create the first extensible version of the app settings area, delivering WhatsApp connection management as its initial section. The authenticated owner must be able to provision, inspect, connect, and manage the WhatsApp connection used by their AI secretary, and also control whether the agent is operationally on or off without affecting the WhatsApp session, with a deterministic company-to-Evolution-instance relationship.

## In Scope

- A settings experience in `web/` whose first delivered section is WhatsApp connection management
- A settings page structure that is ready to receive future settings categories without requiring a full page rewrite
- API contracts in `api/` to expose WhatsApp instance state for the authenticated company
- Provisioning a dedicated Evolution instance for a company
- Preferred automatic instance creation during company creation
- Backfill-compatible provisioning for legacy companies that do not yet have an instance
- Fetching connection data from Evolution to let the owner connect WhatsApp
- Reading and surfacing the current Evolution/WhatsApp connection state
- Allowing the owner to turn the agent on or off independently from the WhatsApp connection state
- Allowing the owner to explicitly disconnect the WhatsApp session
- Persisting enough company-linked metadata to resolve the correct Evolution instance deterministically
- Incremental delivery that can be implemented and validated task by task

## Out of Scope

- Supporting multiple WhatsApp numbers per company
- Supporting multiple Evolution instances per company
- Migrating a connected WhatsApp session between companies
- Advanced recovery flows beyond the main connection lifecycle
- Detailed telemetry/analytics dashboards for WhatsApp health
- Background auto-refresh/push sync beyond what is needed for a usable status experience
- Future settings categories such as:
  - agent response control over who should be answered or ignored
  - agent personality
- Building the business rules or API contracts for non-WhatsApp settings
- Advanced operational modes beyond a simple v1 on/off toggle for the agent
- Provisioning external infra outside the existing Evolution API integration

## Assumptions

1. Each company should own exactly one canonical Evolution instance in v1.
2. The canonical instance identity must be persisted in the product domain and not inferred only from transient runtime state.
3. Company creation should provision the Evolution instance automatically when possible.
4. Legacy companies created before this behavior exists must be able to provision the missing instance from the settings flow without admin support.
5. The connection flow should rely on Evolution API as the source of truth for connection state.
6. For v1, manual disconnect is needed, but manual instance deletion is not required as a user-facing capability.
7. If provisioning during company creation fails, company creation should not become permanently unusable; the settings flow must allow retry/recovery.
8. For v1, agent operational control can be modeled as a simple company-level boolean toggle.
9. WhatsApp connection state and agent operational state are separate concerns and must not be inferred from one another.

## Users

- Authenticated owner managing their company's AI secretary
- Authenticated owner finishing setup after onboarding or after company creation
- Authenticated owner of a legacy company that has never been linked to an Evolution instance

## User Scenarios

### Owner opens app settings

- the page should show whether the company already has a linked Evolution instance
- the page should show the current WhatsApp connection status in product language that is understandable to a non-technical owner
- the page should also show whether the agent is currently on or off

### Owner with a newly created company opens settings

- if instance provisioning succeeded during company creation, the owner should be able to continue directly to connection status and connect actions
- if provisioning did not happen or failed, the owner should be able to trigger provisioning from settings

### Owner of a legacy company without an instance opens settings

- the page should clearly indicate that WhatsApp is not yet configured
- the owner should be able to create the missing instance from the same screen

### Owner wants to connect WhatsApp

- the owner triggers the connect flow
- the app loads the QR code or equivalent pairing payload from Evolution
- the owner scans or uses the provided pairing information in WhatsApp
- the page can be refreshed or retried to confirm the connection state

### Owner returns later to check status

- the page should show whether the agent is connected, connecting, disconnected, or unavailable
- the page should show the company-linked WhatsApp connection state without requiring another setup wizard
- the page should separately show whether the agent is operationally enabled or disabled

### Owner wants to pause the agent without disconnecting WhatsApp

- the owner can turn the agent off from settings while keeping the WhatsApp instance connected
- after turning it off, the connection status can remain connected, but the agent must stop replying automatically
- the owner can later turn the agent back on without reconnecting WhatsApp

### Owner needs to disconnect

- the owner can explicitly disconnect the linked WhatsApp session
- after disconnecting, the page should return to a disconnected state and allow reconnection

## Expected WhatsApp Settings Flow

### Step 1: Resolve company-linked instance

Purpose:
- determine whether the authenticated company already has a canonical Evolution instance

Expected behavior:
- the backend resolves the managed company from the authenticated user
- if company-linked instance metadata exists, it is used as the single source of truth
- if the company has no instance metadata, the system treats it as not provisioned

### Step 2: Provision missing instance

Purpose:
- create the canonical Evolution instance when the company does not have one yet

Expected behavior:
- preferred path: the instance is created during company creation
- recovery path: settings can create the instance on demand for legacy or previously failed companies
- the instance is linked back to the company in persistent storage
- duplicate provisioning must be prevented for the same company

### Step 3: Read connection status

Purpose:
- surface the current connection state of the company instance

Expected behavior:
- the backend queries Evolution `connectionState`
- the web app maps the raw provider response into clear product states
- status loading failures remain recoverable and do not destroy the linked instance mapping

### Step 4: Read agent operational status

Purpose:
- surface whether the agent is currently enabled to reply automatically

Expected behavior:
- the backend returns the persisted company-level on/off status for the agent
- the web app presents this status separately from the WhatsApp connection state
- a connected WhatsApp session must not imply that the agent is enabled
- a disabled agent must not imply that WhatsApp is disconnected

### Step 5: Start or resume WhatsApp connect flow

Purpose:
- let the owner finish linking their WhatsApp account

Expected behavior:
- the backend requests connection payload from Evolution `connect/{instance}`
- the web app renders the returned QR code and/or pairing data in a dedicated section
- the owner can retry fetching the connection payload if it expires or if the first attempt fails

### Step 6: Confirm connected state

Purpose:
- allow the owner to verify that the agent is actually connected

Expected behavior:
- the page can refresh the current status after the user scans the QR code
- once connected, the screen shows a stable connected state and removes the need to re-provision the instance

### Step 7: Turn the agent on or off

Purpose:
- let the owner control automatic agent replies without affecting the WhatsApp session

Expected behavior:
- the backend updates the persisted operational on/off flag for the managed company
- turning the agent off does not log out or disconnect WhatsApp
- turning the agent on does not require a fresh WhatsApp connection if one is already active
- the web app keeps the operational toggle and the connection controls visually distinct

### Step 8: Disconnect when needed

Purpose:
- allow safe logout of the WhatsApp session without deleting the company linkage

Expected behavior:
- the backend calls Evolution logout for the canonical instance
- the company remains linked to the same instance
- the current operational on/off flag remains independent from the disconnect action
- the owner can reconnect later using the same settings flow

## Functional Requirements

1. The system must maintain a deterministic one-to-one link between a company and its canonical Evolution instance.
2. The preferred behavior must provision the company's Evolution instance at company creation time.
3. The product must support legacy companies that have no Evolution instance yet.
4. The settings UI must show whether the company has a provisioned Evolution instance.
5. The settings UI must show the current WhatsApp connection status for the company's canonical instance.
6. The settings UI must show the current operational state of the agent as a separate concept from WhatsApp connection state.
7. The API must expose a dedicated authenticated contract for reading the managed company's WhatsApp settings state, including both connection state and agent operational state.
8. The API must allow provisioning the missing instance for the authenticated company when none exists.
9. The API must prevent duplicate instance provisioning for the same company.
10. The API must expose a contract to request the QR code or pairing payload needed to connect WhatsApp for the canonical instance.
11. The API must expose a contract to refresh or re-read the current connection status.
12. The API must expose a contract to turn the managed agent on or off without disconnecting WhatsApp.
13. The API must expose a contract to disconnect the canonical WhatsApp session.
14. Disconnecting must not sever the persisted company-to-instance relationship.
15. Turning the agent off must prevent automatic replies while preserving the current WhatsApp connection if it exists.
16. The settings flow must remain usable if initial provisioning during company creation failed.
17. Provider failures must surface recoverable product feedback rather than silent failure.
18. The web app must preserve the existing authenticated area and company ownership rules.
19. The first version must be shippable incrementally, with task boundaries that allow validation after each task.

## Cross-App Responsibilities

### API

- persist the canonical Evolution instance linkage for each company
- create the Evolution instance during company creation when possible
- persist the company-level operational on/off state used to enable or disable automatic agent replies
- expose authenticated company-scoped contracts for:
  - reading WhatsApp settings state
  - provisioning a missing instance
  - requesting connection payload
  - reading connection status
  - turning the agent on or off
  - disconnecting the session
- translate Evolution responses into stable product-facing response shapes
- keep WhatsApp connection state and agent operational state modeled and returned separately
- guard against duplicate provisioning and cross-company access
- preserve recovery paths for legacy companies and transient provider failures

### Web

- replace any placeholder or absent settings behavior with a real settings page whose first section is WhatsApp connection management
- structure the settings UI so additional categories can be added later with clear section boundaries and without coupling them to the WhatsApp logic
- load the managed company's WhatsApp settings state
- show clear empty, provisioning-needed, disconnected, connecting, connected, on, off, and error states
- allow the owner to provision the instance when missing
- allow the owner to turn the agent on or off without triggering WhatsApp disconnect
- allow the owner to request and view the QR/pairing payload
- allow the owner to refresh status and disconnect the session
- keep the operational toggle clearly separated from connection controls so the owner does not confuse `turn off agent` with `disconnect WhatsApp`
- keep UI actions narrow and testable so engineers can implement section by section

### Shared Contract Expectations

- the web app needs a company-scoped WhatsApp settings payload that includes at least:
  - company identifier
  - whether an Evolution instance exists
  - canonical instance identifier or name
  - current connection status
  - current agent operational status
  - connection payload when explicitly requested
- the API contracts must stay authenticated and owner-scoped rather than trusting arbitrary company IDs from the browser in v1

## Edge Cases

### Legacy company has no instance

- the settings page should not fail as if the company were misconfigured
- the page should present a recoverable `not provisioned` state and allow provisioning

### Automatic provisioning on company creation fails

- company setup should still be recoverable later from settings
- the failure should not force manual database intervention

### Duplicate provisioning attempt

- repeated clicks or retries must not create multiple instances for the same company
- the product should either reuse the existing linked instance or fail predictably

### Evolution instance exists remotely but local linkage is missing

- the first version should prefer local deterministic linkage rules over provider-side discovery
- if this mismatch is encountered, the product should fail predictably and remain recoverable through controlled support or future remediation work

### Connection payload expires

- the owner must be able to request a fresh connection payload without reprovisioning the instance

### Provider is temporarily unavailable

- load and action failures must surface recoverable feedback
- the owner should be able to retry without corrupting the company linkage

### Already connected instance

- requesting status on an already connected instance should present a connected state without re-running provisioning
- requesting a connect payload for an already connected instance should avoid misleading the owner into thinking a new setup is required

### Agent is off while WhatsApp remains connected

- the settings page must present this as a valid state, not as an inconsistency
- the owner must be able to turn the agent back on without reconnecting WhatsApp

### Owner turns agent off before WhatsApp is connected

- the product may allow the operational state to remain off even while connection is incomplete
- later connecting WhatsApp must not silently turn the agent back on unless the owner explicitly does so

### Disconnect requested while already disconnected

- the operation should fail predictably or behave idempotently, but the resulting product state must remain disconnected and recoverable

### Agent is turned off and WhatsApp is later disconnected

- the two state transitions must remain independent
- reconnecting WhatsApp later must not silently change the saved operational on/off state

## Non-Functional Requirements

- The settings flow must work inside the authenticated app shell on desktop and mobile
- The owner-facing language must be understandable without exposing raw provider internals by default
- The company-to-instance linkage must be explicit and testable
- The implementation should favor narrow, independently verifiable tasks rather than one large cross-app change
- Status reads and connect actions should feel responsive enough for manual setup workflows
- Provider-specific response shapes should be normalized before reaching most of the UI
- The settings page architecture should be extensible so future categories can be added without restructuring the WhatsApp section
- WhatsApp-specific UI and state management should remain sufficiently isolated to avoid coupling future settings categories to this first delivery

## Constraints

- This feature is expected to affect both `api/` and `web/`
- The integration must continue using Evolution API as the WhatsApp provider
- The current codebase already has Evolution service integration, but not full provisioning/connection lifecycle support
- Existing companies may not have any persisted instance linkage yet
- The product must preserve authenticated ownership boundaries for company management
- The delivery should be planned so engineers execute and validate task by task instead of attempting the entire feature at once
- This feature must not expand into non-WhatsApp settings behavior even though the page should be structured for those future additions
- WhatsApp must be treated as the first settings category delivered, not as the entire long-term definition of the settings area

## Acceptance Criteria

1. The authenticated owner can open settings and see whether the company has a WhatsApp instance configured.
2. A newly created company can have its canonical Evolution instance provisioned automatically as part of company creation, or recover later from settings if that provisioning did not complete.
3. A legacy company without an instance can provision the missing instance from the settings screen.
4. The settings screen shows the current WhatsApp connection status for the company's canonical instance.
5. The settings screen shows the agent operational status separately from the WhatsApp connection status.
6. The owner can turn the agent off without disconnecting the current WhatsApp session.
7. When the agent is off and WhatsApp is still connected, the product treats this as a valid state and the agent does not respond automatically.
8. The owner can turn the agent back on without needing to reconnect WhatsApp if the session is still connected.
9. The owner can request the QR code or pairing payload needed to connect WhatsApp for the company's canonical instance.
10. The owner can retry the connect flow without creating a second instance for the same company.
11. The owner can refresh status after scanning and eventually see a connected state.
12. The owner can disconnect the WhatsApp session from the settings screen.
13. Disconnecting leaves the company linked to the same canonical Evolution instance, so reconnection is possible later.
14. Provider or network failures during status reads, provisioning, connect, disconnect, or operational toggle updates show recoverable feedback.
15. The implementation remains owner-scoped and does not let one company manage another company's instance.
16. The delivered settings screen is structured so future settings categories can be added without redesigning the WhatsApp section from scratch.
17. This delivery ships only the WhatsApp settings category and does not implement unrelated settings such as response control or agent personality.
18. The feature can be delivered in small validated tasks across spec, design, implementation, review, and QA rather than one large unverified batch.
