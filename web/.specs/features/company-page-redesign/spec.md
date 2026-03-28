# Company Page Redesign

## Summary

The `Minha Empresa` page should be redesigned to feel clearer, calmer, and more task-oriented.

The current page is functionally correct, but visually and structurally it asks the user to process too many concepts at once:

- page introduction
- company summary
- basic company profile
- knowledge-base viewer
- knowledge-base edit mode

This redesign should preserve the existing data model and API contracts while improving hierarchy, scannability, readability, and interaction clarity.

It is a `web/`-only redesign.

## Problem

The current page is difficult to scan and does not communicate a clear primary workflow.

Today:

- the hierarchy between company profile and knowledge base is weak
- the summary block repeats information already visible elsewhere
- profile editing and knowledge-base editing feel like different interaction systems placed on the same page
- the knowledge-base viewer still reads more like rendered source than a polished business document
- the page depends on too much explanatory copy to communicate what each area means
- on mobile, the composition risks becoming a long stack of heavy cards competing with the authenticated shell bottom navigation

The result is a page that feels operationally noisy instead of focused.

## Goal

Redesign `Minha Empresa` so the owner can quickly understand:

1. what the page is for
2. what information belongs to the company profile
3. what belongs to the assistant knowledge base
4. when they are viewing content versus editing it

The page should feel like a polished SaaS management surface rather than a collection of utility cards.

## In Scope

- Redesign of the `Minha Empresa` page structure and visual hierarchy
- Rework of section ordering and visual emphasis
- Reduction or removal of redundant summary content
- Clearer separation between:
  - basic company information
  - knowledge-base viewing
  - knowledge-base editing
- Improved read-mode presentation for the knowledge base
- More scannable copy, spacing, and layout
- Strong mobile layout within the existing authenticated shell
- Updates to focused component/page tests as needed for the new interaction structure

## Out of Scope

- Backend contract changes
- New company fields or schema changes
- New permissions logic
- Rich-text editor introduction
- Knowledge-base generation changes
- Replacing markdown as the canonical stored format
- Redesign of the global authenticated shell beyond what is needed for page fit and spacing

## Users

- Business owner managing company information
- Business owner reviewing or refining the assistant knowledge base

## Primary Scenarios

### Review current company information

- the owner opens `Minha Empresa`
- the page quickly communicates company profile and knowledge-base status
- the owner can understand the current state without entering edit mode

### Edit basic company information

- the owner edits `name` and `businessType`
- the interaction remains local to the profile area
- the knowledge-base area remains visually and behaviorally separate

### Read the knowledge base

- the owner reads the knowledge base as a formatted document
- headings, paragraphs, and lists are easy to scan
- the page feels like content review, not source inspection

### Edit the knowledge base

- the owner explicitly enters markdown edit mode
- raw markdown is shown only in that mode
- the owner can save or cancel without affecting the profile form interaction

## Functional Requirements

1. The page must preserve a clear visual hierarchy between company profile and knowledge base.
2. The page must not rely on a large redundant summary card if the same information is already visible in stronger sections.
3. The company profile area must remain a separate editing surface from the knowledge-base area.
4. The knowledge base must default to a formatted read mode.
5. Raw markdown must appear only in the dedicated knowledge-base edit mode.
6. Entering knowledge-base edit mode must be an explicit user action.
7. Cancelling knowledge-base editing must return the page to read mode without changing the saved content.
8. Saving profile information must not implicitly enter or exit knowledge-base edit mode.
9. The redesign must fit within the existing `modules/company/**` structure and authenticated shell.
10. The redesign must preserve the existing page responsibilities and API usage rather than inventing a new page contract.

## Non-Functional Requirements

- The page must be more scannable than the current version
- The page must reduce copy density and visual noise
- The knowledge-base viewer must feel document-oriented and readable
- The layout must work on desktop and mobile
- Primary actions must remain reachable on mobile even with the bottom navigation present
- The redesign must remain implementable with the current component architecture and React stack

## Constraints

- This redesign is `web/` only
- Existing API contracts must remain unchanged
- Existing domain split must be preserved:
  - company profile
  - knowledge-base viewing/editing
- The redesign should follow modern SaaS/settings-page patterns without over-designing into a CMS/editor product

## Edge Cases

### Empty knowledge base

- the page must still feel intentional and useful when there is no saved knowledge-base content
- the empty state must encourage editing without overwhelming the page

### Long knowledge base

- the read mode must remain readable for longer markdown content
- the edit mode must remain usable when the markdown is long

### Validation or save failure

- error states must stay local to the section being edited
- one section failing must not visually destabilize the whole page

### Mobile layout

- the redesigned layout must avoid pushing all meaningful actions below excessive intro content
- the page must not compete awkwardly with the bottom navigation

## Acceptance Criteria

1. The redesigned page presents a clearer visual hierarchy than the current implementation.
2. The redundant summary content is removed or substantially reduced.
3. The company profile section is clearly distinguishable from the knowledge-base section.
4. The knowledge base is shown in a readable formatted mode by default.
5. Raw markdown is only visible after entering the dedicated edit mode.
6. Saving the profile does not change the knowledge-base view/edit state.
7. Cancelling knowledge-base editing returns the user to the formatted read mode.
8. The page is visually and structurally usable on mobile within the authenticated shell.
9. The redesign does not require backend contract changes.
10. Focused tests are updated or added so the redesigned interaction structure remains covered.
