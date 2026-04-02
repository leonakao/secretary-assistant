# Contacts Admin Page Design

## Scope

This design covers the authenticated `Contatos` screen in `web/` using the
approved `master-detail` layout on the same route.

Stack constraints:

- keep the current React Router + feature-module structure
- keep Tailwind and `shadcn/ui`
- do not introduce Material UI

## Route and Data Strategy

Route:
- continue using `web/app/routes/app.contacts.tsx`

Loader approach:
- add a `clientLoader` on `app.contacts.tsx`
- loader fetches the current page of contacts and an optional selected contact
  detail when `contactId` exists in the URL search params

Query params:
- `page`
- `pageSize`
- `contactId`

Behavior:
- first render should come from loader data
- page-local state should handle optimistic selection transitions and ignore
  updates after initial render
- changing page or selected contact should update the URL search params so the
  state is shareable and refresh-safe

## API Wrapper Design

Add `web/app/modules/contacts/api/contacts.api.ts` with:

- `getManagedContacts(input, client)`
- `getManagedContactDetail(contactId, client)`
- `updateManagedContactIgnoreUntil(contactId, input, client)`

Suggested types:

```ts
export interface ManagedContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: string | null;
  isIgnored: boolean;
  lastInteractionAt: string | null;
  lastInteractionPreview: string | null;
}

export interface ManagedContactsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ManagedContactsListResponse {
  contacts: ManagedContactListItem[];
  pagination: ManagedContactsPagination;
}

export interface ManagedContactConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ManagedContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  ignoreUntil: string | null;
  isIgnored: boolean;
  lastInteractionAt: string | null;
  preferredUserId: string | null;
}
```

## Page Composition

Primary page:
- `web/app/modules/contacts/pages/contacts-page/index.tsx`

Recommended private components under
`web/app/modules/contacts/pages/contacts-page/components/`:

- `contacts-page-header.tsx`
- `contacts-list-panel.tsx`
- `contacts-list-table.tsx`
- `contacts-list-pagination.tsx`
- `contact-detail-panel.tsx`
- `contact-conversation-timeline.tsx`
- `contact-ignore-card.tsx`
- `contacts-page-skeleton.tsx`

If shared inside the feature later, promote to `web/app/modules/contacts/components/`.

## Layout Strategy

### Desktop

Use a two-column composition:

- left column: list panel with table-like rows, sticky heading and pagination
- right column: selected-contact detail panel

Suggested layout:

```text
header
list panel (minmax(0, 1.15fr)) | detail panel (minmax(320px, 0.85fr))
```

### Mobile

Keep the same route and same data flow, but stack panels:

- header
- list panel
- selected-contact detail panel directly below when `contactId` exists

No modal and no secondary route for detail.

## Interaction Decisions

### Contact selection

- selecting a row sets `contactId` in the URL
- if no `contactId` is present after list load and the list is non-empty,
  auto-select the first contact on desktop only
- mobile should not auto-scroll or force-open detail before user intent

### Pagination

- pagination updates `page` in the URL
- preserve `contactId` in the URL when paginating
- if the selected contact is not on the current page, keep the detail pane open
  using loader-fetched detail data
- the list should show no selected row if that contact is outside the current
  slice

### Ignore-state actions

- `Stop ignoring` appears only when `isIgnored === true`
- `Ignore until` is rendered as a date-time form in the detail pane
- successful save updates both the detail pane and the matching list row if the
  contact is present in the current slice
- save failures stay local to the ignore card

## Visual Direction

Use the existing authenticated-shell language, but reduce placeholder-style
cards in favor of operational surfaces:

- restrained header copy
- clear state badges for ignored status
- compact row layout with strong typography hierarchy
- quiet card chrome and emphasis on data density
- readable conversation timeline with sender distinction and timestamps

Use `shadcn/ui` primitives already present in the app where appropriate:

- `Button`
- `Input`
- `Table` if already available, otherwise semantic div/table markup aligned to
  the current codebase
- badges/surfaces built from current design tokens

## States

### Initial loading

- show a page skeleton with placeholder rows and a placeholder detail card

### Empty list

- render an intentional empty state in the list panel
- hide detail panel when there is no selected contact

### Detail loading

- keep list interactive
- show a local skeleton inside the detail pane

### List load error

- show a full-page recoverable error card for the route

### Detail load error

- keep the list visible
- show an error state only inside the detail panel

### No conversation history

- show the contact identity and ignore controls normally
- replace the timeline body with an empty-state message

## Testing Strategy

Add focused tests for:

- loader-backed initial render with contacts list
- row selection updates the detail pane
- pagination updates visible slice while preserving selected detail when present
- ignore status badges and date rendering
- clearing ignore state updates UI
- setting a future ignore date updates UI
- local detail error and empty-history states

At minimum:

- API wrapper tests in `web/app/modules/contacts/api/contacts.api.test.ts`
- page behavior tests in
  `web/app/modules/contacts/pages/contacts-page/index.test.tsx`

## Risks

- Loader-first plus URL-driven selection adds coordination complexity; keep the
  contract simple and centralize query-param parsing in the route.
- If `shadcn` table primitives are not already installed locally, prefer current
  semantic markup instead of introducing design-system drift during this task.
- Auto-select behavior can feel jumpy on mobile; limit it to desktop behavior.
