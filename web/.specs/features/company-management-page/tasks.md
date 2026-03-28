# Company Management Page - Web Tasks

**Design**: `.specs/features/company-management-page/design.md`
**Status**: Draft

## Execution Plan

```
Phase 1 (Sequential - API Contract Adoption):
  T1 -> T2

Phase 2 (Sequential - Basic Profile Area):
  T2 -> T3

Phase 3 (Sequential - Knowledge Base View/Edit):
  T3 -> T4 -> T5

Phase 4 (Sequential - Tests and Verification):
  T5 -> T6
```

## Task Breakdown

### T1: Add company API client wrappers

**What**: Add the dedicated company management API wrappers and types.
**Where**: `web/app/modules/company/api/company.api.ts`
**Depends on**: None

**Done when**:
- [ ] `getManagedCompany()` exists
- [ ] `updateManagedCompanyProfile()` exists
- [ ] `updateManagedCompanyKnowledgeBase()` exists
- [ ] the page no longer depends on expanding `/users/me`

### T2: Replace the placeholder page with real loading state

**What**: Convert `CompanyPage` from placeholder to a real data-driven page.
**Where**: `web/app/modules/company/pages/company-page/index.tsx`
**Depends on**: T1

**Done when**:
- [ ] page loads the managed company data
- [ ] loading and error states are explicit
- [ ] page renders company-specific content instead of placeholder copy

### T3: Add basic company profile editing

**What**: Add a structured profile section for `name` and `businessType`.
**Where**: `web/app/modules/company/components/company-profile-form.tsx`
**Depends on**: T2

**Done when**:
- [ ] current profile values are displayed
- [ ] owner can edit and save `name` and `businessType`
- [ ] cancelling or save failure behaves locally to the profile section
- [ ] profile save does not affect knowledge-base editing state

### T4: Add formatted knowledge-base viewer

**What**: Render `company.description` as a readable document in default mode.
**Where**: `web/app/modules/company/components/company-knowledge-viewer.tsx`
**Depends on**: T2

**Done when**:
- [ ] markdown is rendered in a scan-friendly way
- [ ] empty knowledge-base state is handled cleanly
- [ ] raw markdown is not shown in default mode

### T5: Add separate knowledge-base edit mode

**What**: Add markdown editing mode as a separate action/area.
**Where**: `web/app/modules/company/components/company-knowledge-editor.tsx`
**Depends on**: T4

**Done when**:
- [ ] edit mode is entered from a distinct action
- [ ] textarea/editor shows raw markdown only in edit mode
- [ ] save persists `description` and returns to view mode
- [ ] cancel discards unsaved markdown changes
- [ ] failed save preserves the markdown draft

### T6: Add focused tests and run verification

**What**: Cover the page interactions and run required web checks.
**Where**: company page/component tests
**Depends on**: T3, T4, T5

**Done when**:
- [ ] profile load/edit flow is tested
- [ ] knowledge-base view/edit separation is tested
- [ ] raw markdown visibility rules are tested
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] relevant tests pass
