# Contacts Admin Page

## Summary

The authenticated `Contatos` area must evolve from a placeholder into a real
contact administration screen.

- The owner must be able to browse the company's saved contacts in a paginated
  management view.
- The owner must be able to inspect each contact's latest interaction and
  recent conversation history.
- The owner must be able to understand whether a contact is currently ignored
  and update that state directly from the screen.
- The page should feel clean, modern, and operationally focused, following
  established admin patterns for scannable tabular data, accessible pagination,
  and clear detail context.

This feature affects both `web/` and `api/`: the web app needs a real contact
management experience, and the API must expose the contact listing, conversation
history, and ignore-state update contracts required by the screen.

## Problem

Today the `Contatos` page is only a placeholder.

Current issues:

- the owner cannot browse the contacts already created by incoming WhatsApp
  conversations
- there is no authenticated contact directory to inspect relationship status
- the owner cannot see the latest interaction or conversation context for a
  contact
- the owner cannot tell whether a contact is currently ignored
- the owner cannot stop ignoring a contact or configure an ignore period until a
  specific date
- the page provides no pagination strategy for a growing contact base
- the product lacks one of the core operational surfaces expected from a
  WhatsApp-first assistant dashboard

This blocks day-to-day administration of customer relationships and makes it
hard for the business owner to intervene in the assistant's contact handling.

## Goal

Create a real `Contatos` page where the owner can review the company's contact
base, inspect recent conversation context, understand current ignore status, and
update whether a contact should remain ignored.

## In Scope

- Replacing the current `Contatos` placeholder page in `web/`
- Loading a paginated contact list for the authenticated owner's company
- Showing each contact's key information in a scannable management list
- Displaying the latest interaction timestamp for each contact
- Displaying whether the contact is currently ignored
- Displaying recent conversation history for a selected contact
- Allowing the owner to:
  - stop ignoring a contact immediately
  - ignore a contact until a chosen future date
- Clear loading, empty, and recoverable error states
- Mobile and desktop layouts that remain usable inside the authenticated shell
- API contracts needed to support the list, detail/history, and ignore-state
  update flows
- Focused tests needed to cover the new screen behavior

## Out of Scope

- Creating or editing general contact profile fields such as name, phone, email,
  or Instagram from this screen
- Bulk actions across multiple contacts
- Manual contact creation or deletion
- Full CRM features such as tags, owners, pipelines, or segmentation
- Real-time live transcript streaming
- Full-text search across all historical messages unless explicitly required by
  the chosen implementation design
- Conversation composer or manual reply UI on this page
- Audit history for ignore-state changes
- Advanced filtering beyond what is necessary for the first usable version

## Users

- Authenticated owner reviewing customer relationships
- Authenticated owner deciding whether the assistant should temporarily ignore a
  contact
- Authenticated owner needing fast context before taking action elsewhere in the
  product

## User Scenarios

### Owner opens `Contatos`

- the page should load a paginated set of contacts for the current company
- the page should immediately communicate directory health and operational state
- the owner should be able to scan who contacted the business recently

### Owner reviews the contact list

- each row or list item should expose enough information to compare contacts
  without opening every detail
- the owner should be able to tell which contacts have recent activity and which
  ones are ignored

### Owner inspects a single contact

- selecting a contact should reveal a conversation context area
- the owner should see recent messages in chronological order with clear sender
  distinction
- the owner should see the latest interaction metadata without leaving the page

### Owner stops ignoring a contact

- if a contact is currently ignored, the owner can remove the ignore restriction
- the UI should update the status clearly after a successful save

### Owner ignores a contact until a date

- the owner can choose a future date/time until which the assistant should
  ignore the contact
- the page should show the resulting ignored state and target date clearly

### Owner navigates between pages

- pagination should preserve orientation and make it clear which slice of data
  is being viewed
- moving between pages should not make the page feel unstable or confusing

## UX Expectations

- The primary surface should favor a clean management layout with a strong
  hierarchy between:
  - contact directory
  - selected contact context
  - ignore-state actions
- The list should prioritize scannability, aligned with admin-table guidance:
  compact rows, predictable columns or fields, and restrained visual noise.
- Pagination should be explicit, accessible, and understandable at a glance,
  following common admin and design-system patterns.
- The detail area should avoid modal overload when an inline or adjacent detail
  surface provides better context continuity.
- The mobile version should preserve the same task flow with a stacked layout,
  not a reduced-function placeholder.
- The visual direction should feel modern and calm rather than dashboard-noisy.

## Functional Requirements

1. The `Contatos` page must load contacts for the authenticated owner's company.
2. The list must be paginated.
3. The page must display, at minimum, for each contact:
   - contact identifier information suitable for recognition
   - last interaction timestamp
   - current ignored/not-ignored state
4. The page must provide a way to inspect conversation history for a selected
   contact.
5. The conversation history shown on the page must be ordered clearly enough for
   the owner to understand the recent exchange.
6. The page must indicate when a contact is ignored until a future date.
7. The page must allow the owner to stop ignoring a contact immediately.
8. The page must allow the owner to set a future ignore-until date for a
   contact.
9. Ignore-state updates must persist through an API contract rather than local
   view-only state.
10. The page must provide recoverable error handling for list loading,
    conversation loading, and ignore-state updates.
11. The page must provide intentional empty states for:
    - no contacts in the company
    - no conversation history for the selected contact
12. The page must provide loading feedback for the initial list load and for
    contact-specific detail loading when needed.
13. The page must remain usable inside the existing authenticated shell on
    desktop and mobile.
14. The implementation must preserve company isolation so owners can only view
    and update contacts belonging to their current company.

## Cross-App Responsibilities

### Web

- replace the current placeholder with a real contact administration page
- render a paginated list or table of contacts
- render selected-contact conversation context
- render ignored/not-ignored state clearly
- provide actions to stop ignoring or ignore until a date
- manage loading, pagination, selection, and recoverable errors
- preserve responsiveness within the authenticated shell

### API

- expose a paginated contact-list contract for the authenticated company
- expose enough list metadata to support:
  - contact identity display
  - last interaction display
  - current ignore state
  - ignore-until timestamp when applicable
- expose a contact conversation-history contract suitable for the detail view
- expose an update contract to change `ignoreUntil`
- enforce company ownership and workspace access rules

### Shared Contract Dependencies

- the web app needs a list payload that includes at least:
  - `id`
  - display name and/or phone
  - `ignoreUntil`
  - last interaction timestamp
  - pagination metadata
- the web app needs a detail/history payload tied to a selected contact
- the web app needs an ignore-state update contract that supports:
  - clearing the ignore date
  - setting a future ignore date

## Data Assumptions

- Contacts are persisted in the existing `contacts` table and already contain
  `ignoreUntil`.
- Recent conversation history can be derived from persisted conversation memory
  associated with the contact's WhatsApp conversation key.
- The first version may limit the amount of history returned in the detail view
  as long as the recent context is useful and predictable.

## Edge Cases

### No contacts available

- the page must show a meaningful empty state rather than an empty shell

### Contact without recent conversation memory

- the contact can still appear in the directory
- the detail area must explain that no conversation history is available yet

### Contact ignored until a past date

- the UI should treat the contact as not currently ignored
- stale past timestamps must not be presented as active ignored status

### Invalid ignore date selection

- the UI must prevent or reject attempts to ignore a contact until a past date

### Save failure when updating ignore state

- the current selection and user context must remain intact
- the UI should preserve draft intent enough for a retry

### Pagination with selected contact

- the product should define deterministic behavior when the selected contact is
  no longer visible in the current page slice

### Long message history

- the detail view must remain readable and bounded even if a contact has a large
  conversation history

### Missing optional identity fields

- the list should still be usable when a contact has only phone number or only a
  fallback display label

## Non-Functional Requirements

- The page must be visually cleaner and more structured than the current
  placeholder.
- The contact list must be highly scannable on desktop.
- The mobile layout must preserve the owner's ability to list contacts, inspect
  one, and update ignore state without hidden functionality.
- Pagination controls must be accessible and understandable.
- The interface should minimize visual clutter and avoid oversized decorative
  elements that compete with operational data.
- The implementation should fit the current `web/` route and feature-module
  architecture.
- The implementation should remain compatible with the current persisted contact
  and memory model unless a design-approved API extension is required.

## Constraints

- This feature is expected to affect both `web/` and `api/`
- The current persisted ignore-state field is `contacts.ignoreUntil`
- The current conversation persistence model is not a dedicated CRM transcript
  model; the first version should build on existing memory records
- The page must fit inside the authenticated shell and coexist with bottom
  navigation on mobile
- The implementation should follow modern admin UX patterns rather than a chat
  app or consumer messaging layout

## Design References

The feature should draw from these interaction principles:

- Material Design data-table guidance for scannable, structured tabular admin
  content
- GOV.UK pagination guidance for accessible pagination controls and orientation

These references inform layout direction and usability expectations, not a
requirement to copy a specific visual system.

## Acceptance Criteria

1. The `Contatos` page replaces the current placeholder with a real contact
   administration experience.
2. The owner can see a paginated list of contacts for the current company.
3. Each listed contact exposes enough information to identify the contact, see
   the latest interaction, and understand whether the contact is currently
   ignored.
4. The owner can open or select a contact and inspect recent conversation
   history.
5. The page clearly indicates whether a contact is ignored until a future date.
6. The owner can stop ignoring a currently ignored contact from the page.
7. The owner can configure a contact to be ignored until a chosen future date.
8. Ignore-state changes persist successfully and are reflected in the UI.
9. The page provides meaningful loading, empty, and recoverable error states.
10. The page is usable on desktop and mobile within the authenticated shell.
11. The feature is covered by focused tests for list rendering, selection or
    detail behavior, pagination behavior, and ignore-state updates.
