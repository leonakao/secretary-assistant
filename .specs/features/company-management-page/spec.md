# Company Management Page

## Summary

The authenticated `Minha Empresa` area must evolve from a placeholder into a real company management screen.

- The owner must be able to view and edit the company's basic information.
- The owner must be able to view the full knowledge base generated from onboarding in a user-friendly format.
- Knowledge base editing must be a separate area/action from basic company information editing.
- The knowledge base remains stored as markdown, but raw markdown should only appear during editing.

This feature affects both `web/` and `api/`: the web app needs a real company management experience, and the API needs explicit company read/update contracts beyond the minimal data currently exposed by `/users/me`.

## Problem

Today the `Minha Empresa` page is only a placeholder.

Current issues:

- the owner cannot edit the company's basic profile from the authenticated area
- the knowledge base generated during onboarding is not visible in a dedicated management screen
- the knowledge base exists as markdown in `company.description`, but there is no user-friendly viewing experience for it
- there is no separation between profile editing concerns and knowledge base editing concerns
- `/users/me` only exposes a minimal `company` shape, which is not enough for a full company management page

This blocks one of the core expectations of the product: the owner should be able to review and maintain the information the assistant uses about the business.

## Goal

Create a real `Minha Empresa` page where the owner can manage basic company information and independently view or edit the company knowledge base generated from onboarding.

## In Scope

- A real `Minha Empresa` page in `web/`
- Loading current company information for the authenticated owner
- Editing and saving the company's basic information
- Viewing the company knowledge base in a formatted, user-friendly way
- A separate editing mode/area for the markdown knowledge base
- API contract(s) to read and update company data needed by this screen
- Clear separation in the UI between:
  - basic company information
  - knowledge base visualization
  - knowledge base editing
- Validation and recoverable error handling for company updates

## Out of Scope

- Regenerating the knowledge base automatically from a new interview
- Version history or audit trail for company edits
- Collaborative editing or multi-user editing workflows
- Rich WYSIWYG knowledge base editing
- Advanced markdown tooling such as comments, suggestions, or side-by-side diffing
- Permissions beyond the current owner/authenticated workspace assumptions
- Editing unrelated company-adjacent resources such as contacts or service requests from this page

## Users

- Authenticated owner with onboarding complete
- Authenticated owner reviewing the generated business knowledge before enabling or refining the assistant

## User Scenarios

### Owner opens `Minha Empresa`

- the page should load the current company information
- the page should show the basic business profile and the knowledge base as separate concerns

### Owner updates basic company information

- the owner can edit basic fields such as company name and business type
- saving those fields should not force entry into markdown editing mode

### Owner reviews the generated knowledge base

- the owner sees the current business knowledge rendered in a readable format rather than raw markdown
- the rendered view should make the onboarding-generated structure easier to scan

### Owner edits the knowledge base

- the owner enters a separate editing mode/section for the knowledge base
- in edit mode, the underlying markdown becomes visible and editable
- saving returns the owner to the formatted knowledge base view

### Owner cancels editing

- unsaved markdown changes can be discarded without affecting basic company information state
- unsaved basic information changes can also be cancelled without affecting knowledge base state

## Company Management Flow

### Section 1: Basic Company Information

Purpose:
- manage the core structured company profile

Expected behavior:
- the page loads currently persisted values
- the owner can edit basic fields already supported by the domain, primarily:
  - `name`
  - `businessType`
- saving only updates the structured company profile fields
- the page shows clear success or recoverable error feedback

### Section 2: Knowledge Base View

Purpose:
- let the owner inspect the assistant's business knowledge in a readable way

Expected behavior:
- the current knowledge base is rendered from `company.description`
- the default experience is a formatted viewer, not a markdown textarea
- empty or missing knowledge base state is handled gracefully

### Section 3: Knowledge Base Edit Mode

Purpose:
- let the owner directly edit the markdown source when needed

Expected behavior:
- edit mode is entered through a distinct action
- raw markdown is shown only in edit mode
- saving updates `company.description`
- cancelling exits edit mode without applying changes
- markdown editing is visually and behaviorally separate from basic info editing

## Functional Requirements

1. The `Minha Empresa` page must load the authenticated owner's current company information.
2. The page must expose a dedicated basic-information editing area.
3. The basic-information area must support at least the currently persisted structured fields `name` and `businessType`.
4. The page must expose a dedicated knowledge base viewing area.
5. The default knowledge base experience must render the markdown content in a user-friendly formatted view.
6. The page must expose a separate action or area to edit the knowledge base markdown.
7. Raw markdown must only be shown during knowledge base editing mode.
8. Saving basic company information must not require editing or saving the knowledge base.
9. Saving knowledge base markdown must not require editing or saving the basic profile fields.
10. The UI must provide recoverable error handling for failed loads and failed saves.
11. The page must preserve the existing authenticated-area shell and onboarding gating behavior.
12. The implementation must not rely on the minimal `SessionUser.company` payload alone; the screen needs a dedicated company data contract.

## Cross-App Responsibilities

### Web

- replace the current company placeholder page with a real management screen
- render separate areas for basic company information and knowledge base
- provide formatted markdown viewing for the knowledge base
- provide separate markdown edit mode for the knowledge base
- manage loading, saving, validation, and recoverable errors

### API

- expose a company read contract with the fields required by the page
- expose company update contract(s) for:
  - basic company information
  - knowledge base markdown
- persist structured fields and markdown independently enough to support separate UI actions
- preserve existing auth/workspace ownership rules for which company the owner can manage

### Shared Contract Dependencies

- the web app needs a dedicated company read payload that includes at least:
  - `id`
  - `name`
  - `businessType`
  - `description`
  - `step`
- the web app needs save contracts that distinguish basic info updates from knowledge base updates or otherwise preserve clear separation

## Edge Cases

### No linked company

- if the authenticated user has no linked company, the page must fail predictably and route or message consistently with existing onboarding/auth rules

### Empty knowledge base

- if `company.description` is empty or null, the page must show a meaningful empty state instead of a broken renderer

### Invalid or undesirable markdown edits

- if the owner saves markdown that is syntactically valid but poor-quality, the system still persists it as the canonical knowledge base unless explicit validation rules reject it

### Concurrent edits

- if basic info and knowledge base are edited separately, saving one area must not silently overwrite unsaved changes in the other

### Save failure

- failed saves must keep the user's current draft in place so they can retry

### Long knowledge base

- the formatted viewer and editor must remain usable with large onboarding-generated markdown content

## Non-Functional Requirements

- The page must work inside the authenticated app shell on desktop and mobile
- The formatted knowledge base view must be noticeably easier to scan than raw markdown
- The editing experience must keep raw markdown available without requiring a full markdown editor product
- The separation between structured profile editing and markdown editing must be explicit and testable
- The implementation should build on current domain fields before introducing new company schema unless clearly required

## Constraints

- This feature is expected to affect both `web/` and `api/`
- The current source of knowledge base content is `company.description`
- The currently persisted structured company fields are limited, so the first version should stay anchored to existing data such as `name` and `businessType`
- The existing authenticated-area and onboarding gating rules must remain intact

## Acceptance Criteria

1. The `Minha Empresa` page replaces the current placeholder with a real company management screen.
2. The owner can view the current company `name` and `businessType`.
3. The owner can edit and save the company's basic information without entering markdown editing mode.
4. The page shows the current company knowledge base in a formatted, user-friendly view by default.
5. Raw markdown is not shown in the default knowledge base view.
6. The owner can enter a separate edit mode or area to edit the knowledge base markdown.
7. In knowledge base edit mode, the current markdown source is visible and editable.
8. Saving knowledge base edits updates the persisted company knowledge base and returns to a readable formatted view.
9. Cancelling knowledge base edit mode discards unsaved markdown changes.
10. Failures while loading or saving show recoverable feedback without losing the current draft.
11. The page continues to respect authenticated-area and onboarding access rules.
12. The API exposes enough company data and update capability for the web page to function without overloading `/users/me`.
