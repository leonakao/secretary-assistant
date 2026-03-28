# Authenticated Area Shell

## Overview

This feature turns the current one-off dashboard route into a reusable authenticated application shell under `/app`.

The target outcome is:

1. one shared protected shell for all logged-in pages
2. desktop sidebar navigation for primary destinations
3. mobile bottom navigation for the same primary destinations
4. differentiated placeholder pages that prove the structure can scale

The shell should absorb the shared session and onboarding gating that is currently embedded in the dashboard page, so future authenticated pages do not repeat that logic.

## Design Goals

1. Move the logged-in area to `/app` without changing current backend contracts.
2. Centralize authenticated-route protection and onboarding gating in one place.
3. Keep desktop and mobile navigation aligned on the same route model.
4. Make adding future logged-in pages mostly a route-and-nav-item change.
5. Keep placeholders intentionally designed, but structurally light.

## Route Structure

The authenticated area should move to nested routes under `/app`.

Recommended route map:

- `/app`
  - default dashboard overview
- `/app/company`
  - Minha empresa placeholder
- `/app/contacts`
  - Contatos placeholder
- `/app/settings`
  - Configurações placeholder

Migration rules:

- existing `/dashboard` should redirect to `/app`
- no new page should be added under `/dashboard/*`
- login redirect defaults and onboarding completion redirects should point to `/app`

## Shared Shell Ownership

Create a shell boundary that owns:

- auth/session bootstrap via `/users/me`
- onboarding gating
- logout action
- shared header/sidebar/bottom-nav
- current session user display used across app pages

This shell should render an inner page outlet/content region once access is confirmed.

Recommended module boundary:

- `web/app/modules/app-shell/`
  - `layouts/authenticated-app-shell.tsx`
  - `components/app-sidebar.tsx`
  - `components/app-bottom-nav.tsx`
  - `components/app-shell-header.tsx`
  - `components/app-nav-link.tsx`
  - `config/app-navigation.ts`
- `web/app/modules/dashboard/`
  - `pages/app-home-page/`
- `web/app/modules/company/`
  - `pages/company-page/`
- `web/app/modules/contacts/`
  - `pages/contacts-page/`
- `web/app/modules/settings/`
  - `pages/settings-page/`

Recommended route boundary:

- route file for `/app`
- child route files for `/app/company`, `/app/contacts`, `/app/settings`

Ownership rule:

- `app-shell` owns only shared authenticated chrome, navigation, and gating
- `dashboard`, `company`, `contacts`, and `settings` own their page content, local components, and future growth paths

## Protection and Gating Design

Current gating behavior lives mostly in the dashboard page and onboarding route.

After this feature:

- `/app` and `/app/*` should share one protection flow
- unauthenticated users redirect to `/login?mode=signin&redirectTo=%2Fapp`
- users with onboarding still required redirect to `/onboarding`
- users with valid protected session render the shell and target page

Recommended implementation shape:

- move the bootstrap logic currently in `dashboard-page/index.tsx` into `AuthenticatedAppShell`
- keep the current `bootstrapAuthSession()` and `resolveAuthenticatedEntryTarget()` contracts
- when target resolves to onboarding, shell should redirect before inner page content renders

This keeps all protected app routes consistent and avoids duplicating `/users/me` bootstrapping.

## Navigation Model

Use one shared navigation config to drive both desktop sidebar and mobile bottom nav.

Recommended nav items:

```ts
[
  { to: '/app', label: 'Dashboard', icon: ... },
  { to: '/app/company', label: 'Minha empresa', icon: ... },
  { to: '/app/contacts', label: 'Contatos', icon: ... },
  { to: '/app/settings', label: 'Configurações', icon: ... },
]
```

This config should be the single source of truth for:

- sidebar items
- mobile bottom navigation items
- active-state matching

## Desktop Layout

Desktop should use a left sidebar plus main content region.

Recommended shell regions:

- left sidebar
  - product mark/title
  - nav items
  - company/session summary
  - logout action
- top content header
  - current page title/subtitle
  - optional small actions or context slot
- main content area
  - page-specific content card/grid

The sidebar should remain visible on large screens and not be rebuilt inside each page.

## Mobile Layout

Mobile should use a compact top bar plus bottom navigation.

Recommended behavior:

- top bar shows app title and current page label
- bottom navigation exposes the same 4 primary destinations
- bottom nav remains visible across authenticated pages

Bottom navigation should:

- clearly indicate the active page
- remain usable with one hand
- not hide the current page context

The mobile layout should not attempt to reproduce the full desktop sidebar in an overlay for this first slice.

## Page Composition

Each page should render inside the shared shell content area and be intentionally differentiated.

### `/app`

This becomes the dashboard overview page.

Keep the current protected-session emphasis, but reshape it to fit the shell:

- summary cards instead of full-page shell responsibilities
- current user/session/company status
- short “next steps” area

### `/app/company`

Placeholder theme:

- company profile and business setup
- cards for company name, status, and what will eventually live here
- light copy focused on assistant/business setup

### `/app/contacts`

Placeholder theme:

- future contact directory/customer management
- cards or list preview framing
- copy focused on customer conversations and relationship tracking

### `/app/settings`

Placeholder theme:

- account and assistant settings
- settings sections preview
- copy focused on preferences, integrations, and workspace configuration

These pages should share shell chrome but differ enough in title, copy, and section framing that navigation feels real.

## Existing Module Migration

Current file:

- `web/app/modules/dashboard/pages/dashboard-page/index.tsx`

Recommended migration:

- reduce current dashboard page into app-home content only
- move shell-level auth/gating/logout/nav concerns out of that page
- relocate the page into the `dashboard` module as the `/app` home page
- keep future dashboard growth inside `modules/dashboard/**`, not inside the shell module

Current route:

- `web/app/routes/dashboard.tsx`

Recommended migration:

- replace with redirect route to `/app`
- add new app route files for nested structure

## Component Boundaries

Recommended reusable shell components:

- `authenticated-app-shell.tsx`
- `app-sidebar.tsx`
- `app-bottom-nav.tsx`
- `app-shell-header.tsx`
- `app-nav-link.tsx`

Recommended page-level components:

- one page component per route, owned by its dedicated module
- optional shared placeholder section/card components if reuse stays simple

Do not over-abstract placeholders into one generic meta-component unless it clearly reduces repetition without flattening page identity.

## Active State and Matching

Active state should be route-driven, not local UI state.

Rules:

- `/app` activates Dashboard only
- `/app/company` activates Minha empresa
- `/app/contacts` activates Contatos
- `/app/settings` activates Configurações

Use router path matching instead of manual page state.

## Testing Strategy

Test coverage should focus on behavior, not visual snapshots.

Priority scenarios:

- unauthenticated access to `/app` redirects to login
- onboarding-required user hitting `/app` redirects to onboarding
- eligible user reaches shell and sees navigation
- `/dashboard` redirects to `/app`
- desktop and mobile nav both expose the same destinations
- active-state behavior matches current route
- each placeholder route renders distinct content inside the shell

Recommended test areas:

- route-level tests for protected entry and redirect behavior
- shell-level tests for navigation presence and active state
- lightweight tests for placeholder page identity/content per module

## Risks

- the shell module can become a dumping ground if page concerns leak back into `app-shell`
- route migration may feel complete while imports still point to old dashboard-only ownership
- shared placeholder helpers can accidentally flatten page identity if reused too aggressively

### Gating Duplication

If the shell and page components both keep session bootstrap logic, the migration will only move complexity around.

Mitigation:

- shell should be the only owner of `/users/me` bootstrap for `/app/*`

### Redirect Drift

Current code still assumes `/dashboard` in several login/onboarding flows.

Mitigation:

- update all protected-entry redirect targets in one implementation slice
- keep `/dashboard` as a compatibility redirect route only

### Mobile Navigation Overlap

Bottom navigation can fight with page padding or content overflow.

Mitigation:

- shell owns bottom spacing/padding for mobile layouts
- page content should not manually compensate per page

### Placeholder Over-Engineering

Trying to make placeholders too custom can bloat the slice.

Mitigation:

- differentiate by title, copy, iconography, and section framing only
- avoid fake heavy business logic
