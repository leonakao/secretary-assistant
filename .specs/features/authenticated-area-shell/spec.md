# Authenticated Area Shell

## Summary

The logged-in area must stop being a single protected page and become a reusable application shell that can host multiple authenticated pages consistently.

- The web app must provide a reusable authenticated layout for desktop and mobile.
- The logged-in area must expose clear primary navigation so new pages can be added without rebuilding layout and route logic each time.
- The first set of destination pages should include placeholders for `Minha empresa`, `Configurações`, and `Contatos`.
- The existing dashboard should become one destination inside that shell rather than a one-off protected page.

This feature is primarily a `web/` feature. It restructures the authenticated experience and route hierarchy, but does not introduce new backend requirements beyond the existing session and onboarding checks.

## Problem

Today the authenticated area is effectively a single `dashboard` page.

Current issues:

- there is no reusable logged-in layout or shell
- there is no sidebar or mobile navigation pattern
- future authenticated pages would require duplicating protection, layout, and navigation logic
- the current dashboard is acting both as product entry point and as temporary layout, which makes it hard to evolve cleanly

This creates friction for expansion of the product and makes even simple additions to the logged-in area structurally expensive.

## Goal

Create a reusable authenticated area shell that supports desktop and mobile navigation, keeps onboarding/auth protection intact, and makes it straightforward to add new logged-in pages.

## In Scope

- A reusable authenticated layout/shell for the web app
- Desktop navigation pattern for authenticated pages
- Mobile variation of authenticated navigation
- Route structure for multiple authenticated pages
- Migration of the current dashboard into the new authenticated shell
- Placeholder destination pages for:
  - `Minha empresa`
  - `Configurações`
  - `Contatos`
- Active navigation state for the current page
- Preservation of current onboarding/auth gating behavior for authenticated routes
- Design review and structural cleanup of the current dashboard page so it fits into the shell

## Out of Scope

- Full implementation of company management features
- Full implementation of contacts management features
- Full implementation of account or product settings
- Role-based permission systems
- Multi-tenant admin panels
- Backend API changes solely for this navigation shell
- Final information architecture for every future page in the product

## Users

- Authenticated owner who has already completed onboarding
- Authenticated owner who is still subject to onboarding gating and should not access the full shell yet

## User Scenarios

### Authenticated + onboarding complete

- entering the protected area should open the authenticated shell
- the user should see a clear primary navigation structure
- the user should be able to move between Dashboard, Minha empresa, Contatos, and Configurações without leaving the logged-in experience

### Authenticated + onboarding incomplete

- the user should continue to be routed to onboarding instead of accessing the authenticated shell
- the new shell must not bypass the existing onboarding rules

### Unauthenticated

- the user should continue to be redirected to the login flow when trying to access authenticated routes

### Mobile authenticated user

- the user should still have access to the same primary destinations through a mobile-appropriate navigation variation

## Authenticated Area Flow

### Protected Entry

Purpose:
- keep current access protection behavior intact
- turn the dashboard into one page inside a larger authenticated area

Expected behavior:
- authenticated users who are dashboard-eligible enter the authenticated shell
- authenticated users who still require onboarding are redirected to onboarding
- unauthenticated users are redirected to login

### Shell Layout

Purpose:
- provide a reusable structure for all logged-in pages

Expected behavior:
- desktop shows a persistent primary navigation area
- mobile shows a compact but accessible navigation variation
- page content renders inside a consistent content region
- shared actions such as logout can live in the authenticated shell instead of being redefined per page

### Page Navigation

Purpose:
- validate the new shell with multiple destinations

Expected behavior:
- the shell exposes at least these destinations:
  - Dashboard
  - Minha empresa
  - Contatos
  - Configurações
- the active destination is visually clear
- route changes do not break the authenticated shell
- placeholder pages are enough for now, as long as navigation works cleanly

## Functional Requirements

1. The web app must provide a reusable authenticated shell that can host multiple pages.
2. The current dashboard must be rendered inside that shell rather than owning its own standalone layout.
3. The shell must support a desktop navigation pattern suitable for adding more pages later.
4. The shell must support a mobile navigation variation for the same destinations.
5. The navigation must include Dashboard, Minha empresa, Contatos, and Configurações.
6. Each destination must have its own route and renderable page, even if some pages are placeholders.
7. The active route must be reflected in the navigation UI.
8. Existing authentication protection must continue to apply to authenticated routes.
9. Existing onboarding gating must continue to prevent incomplete users from entering the authenticated shell.
10. The shell must make it easy to add future authenticated pages without repeating route protection and shared layout code.
11. Placeholder pages must look intentional and integrated into the shell, not like route errors or blank views.

## Cross-App Responsibilities

### Web

- define the authenticated shell and route hierarchy
- render desktop and mobile navigation
- move dashboard content into the shell
- add placeholder pages and active navigation behavior
- preserve login and onboarding route gating

### API

- no new API behavior is required for the base shell
- existing `/users/me` protection and onboarding state remain the source of truth for whether the shell is accessible

## Edge Cases

### Direct deep link to a shell page

- opening `/dashboard`, `/dashboard/minha-empresa`, `/dashboard/contatos`, or `/dashboard/configuracoes` directly must still honor auth and onboarding checks

### Onboarding state changes after login

- if the backend reports that onboarding is still required, the shell must not render protected inner pages

### Mobile navigation state

- opening and closing the mobile navigation must not lose the current route context

### Placeholder destinations

- placeholder pages must still provide enough structure to prove the shell works and to support later replacement with real content

### Unknown authenticated route

- invalid protected paths should fail in a predictable way within the routing system, not by breaking the shell state

## Non-Functional Requirements

- The authenticated shell must work on desktop and mobile web
- The layout must be reusable for future logged-in pages
- Navigation state must be deterministic and easy to test
- The implementation should reduce future duplication in authenticated page creation
- The shell should preserve current session and onboarding protections rather than forking them

## Constraints

- This feature should stay primarily in `web/`
- It should build on the current route/auth/onboarding model instead of redesigning the entire authentication system
- Placeholder pages are acceptable as long as routing and shell structure are real
- Do not over-design permissions, submenus, or advanced navigation systems yet

## Acceptance Criteria

1. A reusable authenticated shell exists for the logged-in area.
2. The current dashboard renders inside that shell.
3. Desktop users see a primary navigation structure for the logged-in area.
4. Mobile users see a functional navigation variation for the same destinations.
5. The authenticated navigation includes Dashboard, Minha empresa, Contatos, and Configurações.
6. Each navigation item routes to its own page successfully.
7. The active page is visually indicated in the navigation.
8. Placeholder pages for Minha empresa, Contatos, and Configurações render inside the authenticated shell.
9. Unauthenticated access to authenticated routes still redirects to login.
10. Users who still require onboarding are still redirected to onboarding instead of entering the authenticated shell.
11. Adding another authenticated page after this feature would not require duplicating the entire page layout and protection structure.

## Open Decisions To Confirm

1. Should the URL structure remain flat under `/dashboard/...` or should the logged-in area move to a broader namespace such as `/app/...` while keeping dashboard as one child page?
2. On mobile, should the primary navigation be a drawer, bottom navigation, or another compact pattern?
3. Should the placeholder pages reuse a single generic placeholder template with different titles, or should each already have slightly differentiated copy/content?
