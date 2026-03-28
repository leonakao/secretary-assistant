# Company Management Page

## Overview

The API side of this feature should expose a small, explicit company-management contract for the authenticated owner.

The current `/users/me` payload is intentionally minimal and should stay that way. The company page should instead use dedicated endpoints that:

1. load the current managed company
2. update basic structured company fields
3. update the markdown knowledge base independently

This keeps the page decoupled from auth bootstrap and preserves the explicit separation between profile editing and knowledge-base editing.

## Existing Anchors

- `api/src/modules/companies/entities/company.entity.ts`
- `api/src/modules/users/use-cases/get-users-me.use-case.ts`
- `api/src/modules/onboarding/utils/find-active-user-company.ts`
- `api/src/modules/ai/tools/update-company.tool.ts`
- `api/src/modules/ai/tools/finish-onboarding.tool.ts`

## Design Goals

1. Keep `/users/me` minimal and avoid turning it into a page-specific payload.
2. Reuse the existing `Company` fields already persisted today: `name`, `businessType`, `description`, `step`.
3. Separate basic company profile updates from markdown knowledge-base updates.
4. Resolve the authenticated owner's managed company deterministically.
5. Keep the contracts small and directly aligned to the company page UI.

## Data Model

No schema expansion is required for v1 of this page.

Current fields already sufficient:
- `id`
- `name`
- `businessType`
- `description`
- `step`
- `updatedAt`

Interpretation:
- `description` remains the canonical markdown knowledge base
- `name` and `businessType` remain the editable structured profile fields

## Company Resolution

The company-management endpoints should not trust arbitrary company IDs from the browser in v1.

Recommended rule:
- resolve the managed company from the authenticated user, using the same preferred-company logic already established for onboarding/session state
- prefer the current active company relation for the authenticated user

Recommended extraction:
- create a shared resolver utility/use-case in `companies/` or `users/` scope instead of duplicating repository queries in each controller

This avoids a UI contract like `PATCH /companies/:id` for the first version and keeps ownership rules explicit.

## API Contracts

### `GET /companies/me`

Purpose:
- fetch the current managed company for the authenticated owner

Response:

```ts
interface GetManagedCompanyResponse {
  company: {
    id: string;
    name: string;
    businessType: string | null;
    description: string | null;
    step: 'onboarding' | 'running';
    updatedAt: string;
  };
}
```

Rules:
- `404` if the authenticated user has no managed company
- `401` if unauthenticated
- response stays focused on the company page, not auth/session concerns

### `PATCH /companies/me/profile`

Purpose:
- update structured basic profile fields only

Request:

```ts
interface UpdateManagedCompanyProfileRequest {
  name: string;
  businessType: string | null;
}
```

Response:

```ts
interface UpdateManagedCompanyProfileResponse {
  company: {
    id: string;
    name: string;
    businessType: string | null;
    description: string | null;
    step: 'onboarding' | 'running';
    updatedAt: string;
  };
}
```

Rules:
- does not modify `description`
- validates trimmed non-empty `name`
- allows empty/null `businessType`

### `PUT /companies/me/knowledge-base`

Purpose:
- replace the canonical markdown knowledge base

Request:

```ts
interface UpdateManagedCompanyKnowledgeBaseRequest {
  markdown: string;
}
```

Response:

```ts
interface UpdateManagedCompanyKnowledgeBaseResponse {
  company: {
    id: string;
    name: string;
    businessType: string | null;
    description: string | null;
    step: 'onboarding' | 'running';
    updatedAt: string;
  };
}
```

Rules:
- updates only `description`
- preserves the profile fields untouched
- accepts raw markdown as-is after basic trimming/normalization

## Module Shape

Recommended new API pieces:

- `api/src/modules/companies/controllers/companies-me.controller.ts`
- `api/src/modules/companies/dto/update-managed-company-profile.dto.ts`
- `api/src/modules/companies/dto/update-managed-company-knowledge-base.dto.ts`
- `api/src/modules/companies/use-cases/get-managed-company.use-case.ts`
- `api/src/modules/companies/use-cases/update-managed-company-profile.use-case.ts`
- `api/src/modules/companies/use-cases/update-managed-company-knowledge-base.use-case.ts`
- optional shared resolver utility for the authenticated user's current company

Reasoning:
- this belongs to the `companies` domain, not onboarding
- the page consumes company management, even though the initial knowledge came from onboarding

## Validation

### Profile

- `name`: required, trimmed, max 255
- `businessType`: optional nullable string, trimmed, max 255

### Knowledge Base

- `markdown`: required string
- can be empty only if product allows explicitly; recommended v1 behavior is allow empty string but preserve an explicit empty state in the UI

## Testing Strategy

Add focused tests for:

- getting the current managed company
- `404` when no company exists
- profile update only changes `name` / `businessType`
- knowledge-base update only changes `description`
- authenticated user cannot accidentally manage another company
- validation failures on bad input

Preferred coverage:
- use-case tests first
- controller tests for request/response and auth guard wiring

## Risks

- Company-resolution logic is currently spread across a few use-cases; duplicating it here would create drift.
- The AI `updateCompany` tool also writes `company.description`; this is not a blocker, but the coexistence should be understood as two valid writers of the same field.
- If the UI later wants richer structured fields, this contract will need expansion, but v1 should stay anchored to the current schema.
