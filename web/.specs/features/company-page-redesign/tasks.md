# Company Page Redesign - Web Tasks

**Design**: `.specs/features/company-page-redesign/design.md`
**Status**: Draft

## Execution Plan

```text
Phase 1 (Sequential - Layout Reframe):
  T1 -> T2

Phase 2 (Sequential - Profile Section Refresh):
  T2 -> T3

Phase 3 (Sequential - Knowledge Base Read/Edit Refresh):
  T2 -> T4 -> T5

Phase 4 (Sequential - Tests and Verification):
  T3, T5 -> T6
```

## Task Breakdown

### T1: Mirror the redesign in the company page composition

**What**: Rework the page-level layout to use a compact header and asymmetric main content grid.
**Where**: `web/app/modules/company/pages/company-page/index.tsx`
**Depends on**: None

**Done when**:
- [ ] the large intro card is replaced with a shorter page header
- [ ] the redundant summary card is removed
- [ ] the page uses a responsive layout with profile as a secondary column and knowledge base as the primary column
- [ ] `updatedAt` is still surfaced in the new header or section metadata

### T2: Update the loading and error surfaces to match the new hierarchy

**What**: Align skeleton and load-error states with the redesigned page framing.
**Where**: `web/app/modules/company/pages/company-page/index.tsx`, `web/app/modules/company/components/company-page-skeleton.tsx`
**Depends on**: T1

**Done when**:
- [ ] loading state visually resembles the new compact header + main content structure
- [ ] load-error state still feels consistent with the redesigned page
- [ ] the page does not regress on initial-load clarity

### T3: Redesign the profile section as a compact summary-first card

**What**: Convert the profile area from form-first UI into a read-first summary card with inline edit mode.
**Where**: `web/app/modules/company/components/company-profile-form.tsx`
**Depends on**: T2

**Done when**:
- [ ] read mode shows structured values for `name` and `businessType`
- [ ] edit mode swaps those values to inputs in place
- [ ] the copy is shorter and more scannable than the current version
- [ ] save/cancel/error feedback stays local to the profile section
- [ ] the section reads as visually secondary to the knowledge base

### T4: Redesign the knowledge-base viewer as a document surface

**What**: Improve the read-mode presentation so the knowledge base feels like a business document rather than a muted utility block.
**Where**: `web/app/modules/company/components/company-knowledge-viewer.tsx`
**Depends on**: T2

**Done when**:
- [ ] the section header is compact and action-oriented
- [ ] rendered markdown has stronger typography and spacing
- [ ] the document body uses a more intentional container treatment
- [ ] the empty state remains useful and includes a clear path to editing

### T5: Refine markdown edit mode inside the knowledge-base section

**What**: Keep markdown editing distinct while visually tying it to the same knowledge-base section.
**Where**: `web/app/modules/company/components/company-knowledge-editor.tsx`
**Depends on**: T4

**Done when**:
- [ ] edit mode has a clear state cue such as `Modo de edição`
- [ ] raw markdown appears only in this mode
- [ ] the editor height supports longer content comfortably
- [ ] action placement is clear on desktop and mobile
- [ ] save/cancel/failure behavior remains local to the knowledge-base section

### T6: Update focused tests and E2E expectations

**What**: Bring page/component tests and Playwright assertions in line with the redesigned structure.
**Where**: company page tests and `web/tests/e2e/company-management.spec.ts`
**Depends on**: T3, T5

**Done when**:
- [ ] tests no longer expect the removed summary block
- [ ] tests cover the profile read-first presentation
- [ ] tests still verify that markdown source only appears in edit mode
- [ ] E2E assertions match the new page structure and labels
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] relevant tests pass
