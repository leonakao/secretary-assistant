# Contacts Admin Page Design

## Scope

This design covers the backend contracts needed to support the `Contatos`
management screen:

- paginated contact list
- selected-contact recent conversation history
- ignore-state updates through `ignoreUntil`

The API will follow the existing authenticated management pattern used by
`/companies/me`.

## Affected Modules

- `api/src/modules/contacts`
- `api/src/modules/chat`
- `api/src/modules/companies` only if shared company-management patterns or
  utilities are reused

## Endpoint Design

### `GET /contacts/me`

Purpose:
- return the paginated list used by the master pane

Query params:
- `page`: integer, default `1`
- `pageSize`: integer, default `20`, max `50`

Response shape:

```ts
interface ManagedContactListItem {
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

interface ManagedContactsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ManagedContactsListResponse {
  contacts: ManagedContactListItem[];
  pagination: ManagedContactsPagination;
}
```

Behavior:
- scoped to the authenticated user's managed company
- sorted by `lastInteractionAt DESC NULLS LAST`, then `createdAt DESC`
- `isIgnored` is derived from `ignoreUntil > now`
- `lastInteractionAt` and `lastInteractionPreview` are derived from the latest
  memory row tied to the contact conversation key

### `GET /contacts/me/:contactId`

Purpose:
- return the payload for the detail pane

Response shape:

```ts
type ManagedContactMessageRole = 'user' | 'assistant' | 'system';

interface ManagedContactConversationMessage {
  id: string;
  role: ManagedContactMessageRole;
  content: string;
  createdAt: string;
}

interface ManagedContactDetail {
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

interface ManagedContactDetailResponse {
  contact: ManagedContactDetail;
  conversation: {
    messages: ManagedContactConversationMessage[];
    hasMore: boolean;
  };
}
```

Behavior:
- returns the selected contact plus bounded recent history
- history is ordered ascending in the final response for readable transcript
- the first version should cap history to the most recent `30` messages
- `hasMore` indicates older history exists outside the returned window

### `PATCH /contacts/me/:contactId/ignore-until`

Purpose:
- update `ignoreUntil` from the detail pane

Request shape:

```ts
interface UpdateManagedContactIgnoreUntilDto {
  ignoreUntil: string | null;
}
```

Response shape:

```ts
interface UpdateManagedContactIgnoreUntilResponse {
  contact: ManagedContactDetail;
}
```

Behavior:
- `null` clears the ignore state
- non-null values must be valid ISO datetime strings in the future
- if the provided datetime is in the past, reject with `400`
- response returns the normalized persisted contact state

## Use-Case Design

### `ListManagedContactsUseCase`

Responsibilities:
- resolve the managed company for the current user
- query contacts for that company with pagination
- enrich list rows with latest interaction metadata
- map dates to response DTOs

Implementation notes:
- use `findManagedUserCompany(...)` like company management
- build conversation key from `companyId` and `contact.phone`
- use a query builder or a focused enrichment query for latest memory per
  conversation key
- avoid loading full conversation history for the list route

### `GetManagedContactDetailUseCase`

Responsibilities:
- validate that the requested contact belongs to the managed company
- fetch recent memory rows for the contact conversation key
- return bounded conversation history and current ignore state

Implementation notes:
- if `phone` is missing, return empty history rather than error
- fetch newest `N` rows descending, then reverse in-memory before responding

### `UpdateManagedContactIgnoreUntilUseCase`

Responsibilities:
- validate company ownership
- validate `ignoreUntil`
- persist the contact update
- return the updated mapped contact

## DTO and Type Design

Add DTOs under `api/src/modules/contacts/dto/`:

- `list-managed-contacts-query.dto.ts`
- `update-managed-contact-ignore-until.dto.ts`

Add response/result types under `api/src/modules/contacts/use-cases/`:

- `contacts-management.types.ts`

This mirrors the structure already used in company management.

## Controller Design

Add a controller under `api/src/modules/contacts/controllers/`:

- `contacts-me.controller.ts`

Routes:
- `GET /contacts/me`
- `GET /contacts/me/:contactId`
- `PATCH /contacts/me/:contactId/ignore-until`

Guarding:
- `@UseGuards(SessionGuard)`
- `@CurrentUser()` current user injection

## Module Wiring

Update `api/src/modules/contacts/contacts.module.ts` to register:

- `Contact`
- `Memory`
- `UserCompany`
- controller
- use cases

Export only what the app needs locally; no cross-module API is required for v1.

## Selection and Pagination Contract Decisions

- Pagination is list-only. The detail route does not paginate independently in
  v1.
- The web should preserve selection by `contactId` in the URL query string.
- If the selected contact is not present in the current page slice, the detail
  pane may still remain open by calling the detail endpoint directly.
- This avoids clearing context when the user paginates after selecting a
  contact.

## Error Handling

- `404` when the user has no managed company or the contact is outside the
  company scope
- `400` for invalid pagination params or past `ignoreUntil` payloads
- API payloads should remain explicit and user-safe; no ORM errors should leak

## Testing Strategy

Add focused tests for:

- list route returns paginated contacts ordered by latest interaction
- `isIgnored` becomes `false` when `ignoreUntil` is past
- detail route returns bounded conversation history in chronological order
- detail route returns empty history when no memory exists
- ignore update accepts `null` and future dates
- ignore update rejects past dates
- company isolation prevents accessing another company's contacts

## Risks

- Latest-interaction enrichment can become expensive if implemented with one
  query per row; prefer a batched query or SQL subquery approach.
- Some contacts may not have `phone`, which means no deterministic conversation
  key; v1 should degrade gracefully to empty history.
- Memory content may contain long system messages; the detail mapping should
  keep the payload bounded.
