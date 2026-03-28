# Company Page Redesign

## Overview

The redesigned `Minha Empresa` page should shift from a card-heavy utility layout to a clearer management surface with one obvious primary area: the company knowledge base.

The page should read in this order:

1. quick page framing
2. compact company profile context
3. document-style knowledge-base reading
4. explicit entry into markdown editing

This keeps the existing data model and page responsibilities intact while making the content easier to scan and the editing modes easier to understand.

## Existing Anchors

- `web/app/modules/company/pages/company-page/index.tsx`
- `web/app/modules/company/components/company-profile-form.tsx`
- `web/app/modules/company/components/company-knowledge-viewer.tsx`
- `web/app/modules/company/components/company-knowledge-editor.tsx`
- `web/app/modules/company/components/company-page-skeleton.tsx`
- `web/app/modules/app-shell/layouts/authenticated-app-shell.tsx`

## Design Goals

1. Establish the knowledge base as the primary surface of the page.
2. Reduce redundant framing and summary content.
3. Keep profile editing available, but visually secondary and more compact.
4. Make read mode feel like reviewing a business document, not inspecting source.
5. Preserve a strong boundary between read mode and markdown edit mode.
6. Keep the layout effective on mobile with the authenticated shell bottom navigation.

## Visual Hierarchy

### Page Header

The top of the page should become a short, high-signal header rather than a large explanatory hero.

Recommended content:

- eyebrow: `Minha empresa`
- title: company name or `Minha empresa`
- short supporting line explaining that this page centralizes profile and assistant knowledge
- small metadata row for `Última atualização`

Rules:

- remove the current intro card treatment
- remove the separate `Resumo atual` card entirely
- keep the header vertically compact so the meaningful content starts above the fold

### Desktop Composition

Recommended layout:

- two-column page on large screens
- left rail for compact profile/context
- right/main column for the knowledge-base area

Suggested ratio:

- `minmax(280px, 360px)` sidebar-like column for profile
- flexible main column for knowledge-base content

This creates a stronger “settings rail + primary document” mental model than the current balanced two-card layout.

### Mobile Composition

Recommended order on mobile:

1. compact page header
2. profile section
3. knowledge-base section

Rules:

- use tighter top copy and spacing than desktop
- keep section actions near their section headers
- maintain enough bottom padding so the last action area does not collide with the bottom navigation
- avoid introductory blocks that push the knowledge base too far down

## Page Structure

### Section 1: Compact Header

Purpose:

- orient the user immediately
- expose the page title and recency hint
- avoid large descriptive panels

Recommended content:

- eyebrow label
- title
- one short sentence
- lightweight timestamp chip or inline metadata

No large background card is needed unless the rest of the page already relies on that container language.

### Section 2: Company Profile Card

This section should become a narrower, calmer support card.

Content:

- section label: `Perfil`
- concise heading
- name field
- business type field
- single entry action for edit mode

Behavior:

- read-first by default
- when not editing, fields should appear as structured values rather than disabled heavy inputs
- when editing, switch to editable fields in place
- save/cancel and any errors stay local to this card

Design guidance:

- replace the current large form-first feel with a summary-first card
- when not editing, show lightweight value rows
- only render form controls with stronger emphasis while editing

### Section 3: Knowledge Base Read Surface

This is the primary content area of the page and should look like a readable internal document.

Content:

- section label: `Base de conhecimento`
- title/subtitle with minimal copy
- primary action: `Editar markdown`
- optional small status text such as origin from onboarding/interview

Viewer treatment:

- render markdown inside a document-like container
- use more breathing room than the current muted panel
- stronger typographic hierarchy for headings
- comfortable paragraph width and spacing
- list spacing that supports scanning
- subtle separation between the section header and the document body

Document styling guidance:

- page-like inner surface instead of generic muted card
- neutral background with light border
- clearer heading scales between `#`, `##`, and `###`
- text should bias toward `foreground`/high legibility rather than muted body copy everywhere
- inline code and emphasis remain supported, but should not dominate the visual system

### Section 4: Knowledge Base Edit Mode

Markdown editing remains a distinct mode inside the knowledge-base section, not a peer card elsewhere on the page.

Behavior:

- entered only from the explicit `Editar markdown` action
- replaces the viewer body within the same section
- retains the same section header so the user understands they are editing the same resource
- textarea/editor area becomes the dominant content of the section while active

Edit-mode framing:

- show a stronger state cue such as `Modo de edição`
- explain briefly that markdown is the canonical source
- keep `Salvar` and `Cancelar` anchored near the editor header and again at the footer if the editor is long

Rules:

- profile card remains visible and unaffected while the knowledge base is editing
- leaving edit mode returns to the formatted viewer
- local save failures do not collapse the section or exit edit mode

## Component-Level Recommendations

### `CompanyPage`

Responsibilities:

- fetch company data
- own top-level loading/error state
- own `isEditingKnowledgeBase`
- compose the new asymmetric page layout

Recommended changes:

- replace the current two-row card grid with one page header and one main responsive grid
- stop reading from `sessionUser.company` for display fallback inside the page body
- centralize page-level metadata formatting, such as `updatedAt`

### `CompanyProfileForm`

Shift this component from “always looks like a form” to “summary card with inline edit state.”

Recommended changes:

- add read-mode value rows for `name` and `businessType`
- reserve input controls for edit mode
- reduce explanatory copy length
- tighten action placement so edit/save/cancel stay in one compact action area

### `CompanyKnowledgeViewer`

This component should own the document-reading experience.

Recommended changes:

- keep lightweight markdown rendering logic or extract small rendering helpers if needed
- improve document typography and spacing
- separate the section chrome from the rendered document body
- refine the empty state so it feels intentional, with a direct path into editing

### `CompanyKnowledgeEditor`

This component should feel like a deliberate editing workspace inside the same section.

Recommended changes:

- stronger edit-mode heading/state cue
- clearer distinction between helper copy and textarea
- maintain local save and error handling
- ensure the editor height is comfortable for long markdown

### Optional Supporting Components

If the current page becomes easier to maintain through extraction, optional subcomponents are reasonable:

- `company-page-header.tsx`
- `company-profile-summary.tsx`
- `company-knowledge-document.tsx`

Only extract if it materially improves readability; do not fragment the module unnecessarily.

## Interaction Rules

1. The page should land in read mode for both profile and knowledge base.
2. The profile card entering edit mode must not change the knowledge-base state.
3. The knowledge-base area entering edit mode must not alter the profile card state.
4. Success and error messages stay scoped to the active section.
5. The knowledge-base viewer remains the most visually prominent block on desktop and mobile.
6. The primary “edit” action for the page is the knowledge-base edit action, not the profile edit action.

## Empty and Long-Content Handling

### Empty Knowledge Base

The empty state should still present the section as important.

Recommended treatment:

- document-like empty container
- short explanation that the assistant knowledge is empty or not yet refined
- direct CTA to enter markdown editing

Avoid:

- generic placeholder language
- large instructional paragraphs

### Long Knowledge Base

Recommended handling:

- document body should support long reading without becoming edge-to-edge
- editor should use a taller textarea by default
- preserve comfortable spacing near the bottom so actions remain usable above the mobile nav

## Testing Implications

Focused web coverage should continue to verify:

- the summary block is no longer rendered
- the profile section remains separate from the knowledge-base section
- read mode shows structured profile values before edit mode
- knowledge base renders in formatted/document mode by default
- markdown source appears only after entering edit mode
- cancel/save behavior preserves the current section boundaries
- mobile-safe spacing or layout classes remain applied where assertions are practical

Likely impacted tests:

- `web/app/modules/company/pages/company-page/*.test.tsx`
- `web/tests/e2e/company-management.spec.ts`

## Risks

1. If the redesign keeps disabled inputs visible in read mode, the profile section will still feel noisy and secondary hierarchy will not improve enough.
2. If the knowledge-base document styling is too muted, the viewer will continue to feel like rendered source instead of a document.
3. If the edit mode is visually too similar to read mode, users will not clearly understand when raw markdown is active.
4. Mobile spacing needs deliberate bottom padding; otherwise action areas can sit too close to the bottom navigation.

## Validation

Implementation should be considered complete when:

- the page header is materially shorter than the current hero + summary composition
- the summary card is removed
- the profile card defaults to read-oriented presentation
- the knowledge-base viewer reads as the primary document surface
- markdown editing remains distinct and local to the knowledge-base section
- focused component tests and E2E expectations are updated to the new structure
