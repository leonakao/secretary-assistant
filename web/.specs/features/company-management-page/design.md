# Company Management Page

## Overview

The `Minha Empresa` page should become a real management screen inside `modules/company/**`, split into two independent editing concerns:

1. structured company profile
2. markdown knowledge base

The default page experience should be read-oriented and easy to scan. Editing should happen in clearly separated UI states so the owner understands whether they are editing profile fields or the assistant knowledge base.

## Existing Anchors

- `web/app/modules/company/pages/company-page/index.tsx`
- `web/app/modules/app-shell/use-authenticated-app-shell.ts`
- `web/app/modules/auth/api/get-current-user.ts`

## Design Goals

1. Replace the placeholder with a useful page without over-expanding the scope.
2. Keep profile editing and knowledge-base editing independent.
3. Use a formatted markdown viewer in read mode.
4. Show raw markdown only in edit mode.
5. Avoid coupling the page to the minimal `/users/me` payload.

## Data Contract Adoption

The page should stop depending on `sessionUser.company` for detailed rendering.

Recommended company API wrapper methods:

- `getManagedCompany()`
- `updateManagedCompanyProfile(input)`
- `updateManagedCompanyKnowledgeBase(input)`

Response shape adopted by the page:

```ts
interface ManagedCompany {
  id: string;
  name: string;
  businessType: string | null;
  description: string | null;
  step: 'onboarding' | 'running';
  updatedAt: string;
}
```

## Page Structure

Recommended page sections:

### Section 1: Company Overview Header

- page heading and short explanation
- current company identity summary
- last updated hint if useful

### Section 2: Basic Company Information

Structured fields only:
- `name`
- `businessType`

Behavior:
- default to read mode or inline editable form
- save and cancel affect only these fields
- loading and save feedback remain local to this section

### Section 3: Knowledge Base Viewer

Default state:
- render `description` as formatted content
- headings, paragraphs, bullet lists, and emphasis should be readable
- empty description shows a meaningful empty state

Recommended implementation:
- use a markdown renderer in read mode, preferably a lightweight dedicated library such as `react-markdown`
- restrict scope to safe common markdown rendering, not a full editor product

### Section 4: Knowledge Base Edit Mode

Separate from profile editing:
- entered from a dedicated `Edit knowledge base` action
- uses a textarea or markdown editor surface
- shows raw markdown only here
- save and cancel are local to this mode

Behavior:
- save returns to rendered viewer mode
- cancel discards unsaved markdown draft
- failure preserves the markdown draft

## Component Shape

Recommended file/module structure:

- `web/app/modules/company/pages/company-page/index.tsx`
- `web/app/modules/company/api/company.api.ts`
- `web/app/modules/company/components/company-profile-form.tsx`
- `web/app/modules/company/components/company-knowledge-viewer.tsx`
- `web/app/modules/company/components/company-knowledge-editor.tsx`
- `web/app/modules/company/components/company-page-skeleton.tsx`
- optional:
  - `web/app/modules/company/types/company.ts`

Responsibilities:
- page owns top-level loading and refresh
- profile form owns structured-field draft and save lifecycle
- knowledge viewer owns formatted rendering
- knowledge editor owns markdown draft/save/cancel lifecycle

## State Model

Recommended top-level page state:

- `company`
- `isLoading`
- `loadError`
- `isEditingKnowledgeBase`

Profile form local state:

- `profileDraft`
- `isSavingProfile`
- `profileError`
- `profileSuccess`

Knowledge editor local state:

- `markdownDraft`
- `isSavingKnowledgeBase`
- `knowledgeError`
- `knowledgeSuccess`

Rule:
- profile and knowledge-base local drafts should not overwrite each other

## UX Rules

- Viewing the page should not drop the owner directly into edit mode
- The knowledge base must read like a document, not like source code, in default mode
- Markdown source must be intentionally entered and intentionally exited
- Mobile layout should preserve the app-shell bottom nav and keep save actions reachable

## Testing Strategy

Preferred web coverage:

- page loads company data and replaces placeholder UI
- profile form shows current `name` and `businessType`
- saving profile does not enter knowledge edit mode
- knowledge base is rendered formatted in default mode
- raw markdown appears only after entering edit mode
- cancelling markdown edit restores view mode without persisting draft
- failed saves preserve drafts

Test levels:
- API wrapper tests for request contracts
- component/page tests for the main interaction states

## Risks

- If the page keeps too much state at the top level, profile and markdown editing will become coupled again.
- Markdown rendering introduces a new dependency or a small rendering layer; keep it intentionally narrow.
- Long markdown documents need a usable editor area and not just a tiny textarea.
