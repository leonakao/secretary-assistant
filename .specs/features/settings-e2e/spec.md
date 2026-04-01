# Settings E2E

## Summary

The authenticated app needs an end-to-end test suite for `/app/settings` that validates the current settings experience as a real owner would use it.

This suite must prove two things:

- the page renders and persists every settings control currently available
- the saved settings actually affect the assistant behavior, including the WhatsApp connection lifecycle and the automatic-reply eligibility rules

The suite must also generate visual evidence of the delivered UI and keep those artifacts outside tracked source paths to avoid accidental commits.

## Goal

Create a deterministic E2E suite for the settings page that covers:

- WhatsApp settings states and actions
- agent operational on/off state
- reply-eligibility configuration for contacts
- persistence after reload
- recoverable error states
- functional behavior validation through the API webhook surface that simulates Evolution

## In Scope

- Playwright coverage for `/app/settings`
- UI-level validation of:
  - initial load
  - `not-provisioned`, `connecting`, `connected`, `disconnected`, and `unknown` WhatsApp states
  - connect, refresh, disconnect, and agent on/off actions
  - reply scope `all`
  - reply scope `specific`
  - name-pattern filter
  - whitelist mode
  - blacklist mode
  - specific mode with no filters
- Visual artifacts for the main settings states
- Validation that the UI sends the expected payloads to settings endpoints
- Validation that the webhook/API behavior changes according to saved settings
- Artifact output in a dedicated git-ignored structure

## Out of Scope

- Visual regression baselines checked into the repository
- Full Evolution API emulation beyond the webhook contract needed for this feature
- Rewriting existing onboarding validation infrastructure
- New product functionality outside what is already present on the settings page

## Users

- Authenticated owner managing the company settings

## User Scenarios

### Owner opens settings

- sees the page shell and all settings sections currently delivered
- sees the current WhatsApp state
- sees whether the agent is on or off
- sees who the agent is allowed to answer

### Owner connects WhatsApp

- if the company has no provisioned instance, the app provisions one
- the app then requests the connection payload
- the page shows the connection state and visual payload area
- the owner can refresh status and later disconnect

### Owner changes who the assistant should answer

- the owner can save `All`
- the owner can save `Specific contacts`
- in specific mode, the owner can use:
  - name pattern
  - whitelist
  - blacklist
- if specific mode has no filters, the page warns that automatic replies will effectively stop

### Owner relies on the saved rules

- after saving, reloading the page shows the same values
- incoming client messages sent through the webhook are answered or ignored according to the saved rules

## Functional Requirements

1. The suite must cover every settings control currently rendered on `/app/settings`.
2. The suite must validate the outgoing UI payloads for:
   - `GET /companies/me/whatsapp-settings`
   - `POST /companies/me/whatsapp-instance`
   - `POST /companies/me/whatsapp-connection`
   - `POST /companies/me/whatsapp-refresh`
   - `POST /companies/me/agent-state`
   - `POST /companies/me/agent-reply-settings`
   - `POST /companies/me/whatsapp-disconnect`
3. The suite must generate screenshots for key settings states.
4. Visual artifacts must be written to a dedicated directory that is git-ignored.
5. The suite must validate at least these UI states:
   - initial page
   - WhatsApp not provisioned
   - WhatsApp connecting
   - WhatsApp connected
   - agent disabled
   - specific-contact rules configured
6. The suite must validate that a newly created company starts with the agent disabled.
7. The suite must validate that toggling the agent does not implicitly change the WhatsApp connection state.
8. The suite must validate persistence after a page reload.
9. The suite must validate recoverable local error states for settings actions.
10. The suite must validate assistant behavior by simulating Evolution through `POST /webhooks/evolution/:companyId/messages-upsert`.
11. The suite must prove these behavior cases:
    - disabled agent does not reply
    - `all` replies
    - `specific + name pattern` replies only on match
    - `specific + whitelist` replies only on match
    - `specific + blacklist` blocks on match
    - `specific` with no filters results in no automatic reply

## Acceptance Criteria

- The settings page E2E suite passes deterministically without Auth0 or Evolution real dependencies.
- The suite produces visual artifacts outside tracked source paths.
- The suite proves both UI correctness and functional settings behavior.
- The suite fails if any current settings section or required action disappears from the page.
