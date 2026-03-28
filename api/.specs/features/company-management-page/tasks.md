# Company Management Page - API Tasks

**Design**: `.specs/features/company-management-page/design.md`
**Status**: Draft

## Execution Plan

```
Phase 1 (Sequential - Read Contract):
  T1 -> T2

Phase 2 (Sequential - Update Contracts):
  T2 -> T3 -> T4

Phase 3 (Sequential - Tests and Verification):
  T4 -> T5 -> T6
```

## Task Breakdown

### T1: Add managed-company resolver

**What**: Centralize how the authenticated user's current company is resolved for company management.
**Where**: `api/src/modules/companies/` or a shared utility used by the new company management use-cases
**Depends on**: None

**Done when**:
- [ ] company management endpoints do not duplicate raw repository lookup logic
- [ ] resolution is deterministic for users with a linked company
- [ ] missing-company behavior is explicit

### T2: Add `GET /companies/me`

**What**: Expose the dedicated company read contract for the company page.
**Where**: new controller + use-case in `api/src/modules/companies/`
**Depends on**: T1

**Done when**:
- [ ] endpoint returns `id`, `name`, `businessType`, `description`, `step`, `updatedAt`
- [ ] endpoint is authenticated
- [ ] endpoint returns `404` when the user has no company
- [ ] `/users/me` remains unchanged

### T3: Add `PATCH /companies/me/profile`

**What**: Expose structured profile editing for `name` and `businessType`.
**Where**: `api/src/modules/companies/`
**Depends on**: T1

**Done when**:
- [ ] `name` is required and validated
- [ ] `businessType` is optional/nullable
- [ ] updating profile does not alter `description`
- [ ] response returns the updated company payload

### T4: Add `PUT /companies/me/knowledge-base`

**What**: Expose knowledge-base markdown updating as a separate contract.
**Where**: `api/src/modules/companies/`
**Depends on**: T1

**Done when**:
- [ ] endpoint accepts raw markdown string input
- [ ] updating knowledge base only changes `description`
- [ ] profile fields are left untouched
- [ ] response returns the updated company payload

### T5: Add focused tests

**What**: Cover read/update behavior and contract separation.
**Where**: use-case and controller specs under `api/src/modules/companies/`
**Depends on**: T2, T3, T4

**Done when**:
- [ ] managed company read is tested
- [ ] no-company case is tested
- [ ] profile update separation is tested
- [ ] knowledge-base update separation is tested
- [ ] invalid input is tested

### T6: Run API verification

**What**: Execute the required project checks for the touched API code.
**Where**: `api/`
**Depends on**: T5

**Done when**:
- [ ] `pnpm lint` passes
- [ ] relevant tests pass
- [ ] `npx tsc --noEmit` is run and any failures are classified as feature-specific or pre-existing
