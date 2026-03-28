# Authenticated Area Shell – Web Tasks

**Design**: `.specs/features/authenticated-area-shell/design.md`
**Status**: Draft

---

## Execution Plan

```text
Phase 1 (Sequential – Route Model and Shared Config):
  T1 -> T2 -> T3

Phase 2 (Sequential – Protected Shell):
  T3 -> T4 -> T5

Phase 3 (Sequential – Dedicated Page Modules):
  T5 -> T6 -> T7 -> T8

Phase 4 (Sequential – Migration and Verification):
  T8 -> T9 -> T10
```

---

## Task Breakdown

### T1: Define `/app` route structure

**What**: Add the new authenticated route hierarchy under `/app` and plan compatibility redirect from `/dashboard`.
**Where**: `web/app/routes.ts`, new route files under `web/app/routes/`
**Depends on**: None

**Done when**:
- [ ] `/app` exists as the authenticated entry route
- [ ] `/app/company`, `/app/contacts`, and `/app/settings` exist
- [ ] `/dashboard` redirects to `/app`
- [ ] route structure is ready for a shared shell

---

### T2: Add shared app navigation config

**What**: Create a single source of truth for authenticated navigation items.
**Where**: new `web/app/modules/app-shell/config/app-navigation.ts`
**Depends on**: T1

**Done when**:
- [ ] nav config contains Dashboard, Minha empresa, Contatos, and Configurações
- [ ] config includes route targets and icon metadata
- [ ] config can drive both sidebar and bottom nav

---

### T3: Create the authenticated shell layout

**What**: Build the reusable shell that owns session bootstrap, onboarding gating, shared header, logout, and page outlet/content region.
**Where**: new `web/app/modules/app-shell/layouts/authenticated-app-shell.tsx`
**Depends on**: T2

**Done when**:
- [ ] shell is the owner of auth/session bootstrap for `/app/*`
- [ ] unauthenticated users redirect to login with `redirectTo=%2Fapp`
- [ ] onboarding-required users redirect to `/onboarding`
- [ ] eligible users reach shell content

---

### T4: Implement desktop sidebar and mobile bottom navigation

**What**: Add shared navigation UI for large and small screens.
**Where**: new shell/navigation components under `web/app/modules/app-shell/components/`
**Depends on**: T3

**Done when**:
- [ ] desktop shows persistent sidebar navigation
- [ ] mobile shows bottom navigation
- [ ] both use the same navigation config
- [ ] active route is visually indicated

---

### T5: Migrate dashboard into `/app`

**What**: Turn the existing dashboard into the `/app` home content inside the shell while keeping ownership inside the `dashboard` module.
**Where**: `web/app/modules/dashboard/**`
**Depends on**: T4

**Done when**:
- [ ] dashboard content renders inside the shell instead of owning its own full-page layout
- [ ] duplicate shell/gating concerns are removed from the dashboard page
- [ ] existing protected-session information still renders correctly
- [ ] the `/app` home remains owned by `modules/dashboard/**`, not by `app-shell`

---

### T6: Add differentiated placeholder page for Minha empresa

**What**: Create `/app/company` with intentional placeholder content related to company/business setup.
**Where**: `web/app/modules/company/**` and new route file
**Depends on**: T5

**Done when**:
- [ ] route renders inside shell
- [ ] page has distinct title/copy/sections
- [ ] page does not feel like a blank placeholder
- [ ] company page ownership is isolated inside `modules/company/**`

---

### T7: Add differentiated placeholder page for Contatos

**What**: Create `/app/contacts` with intentional placeholder content related to contacts/customer management.
**Where**: `web/app/modules/contacts/**` and new route file
**Depends on**: T6

**Done when**:
- [ ] route renders inside shell
- [ ] page has distinct title/copy/sections
- [ ] active nav works for contacts route
- [ ] contacts page ownership is isolated inside `modules/contacts/**`

---

### T8: Add differentiated placeholder page for Configurações

**What**: Create `/app/settings` with intentional placeholder content related to settings/preferences.
**Where**: `web/app/modules/settings/**` and new route file
**Depends on**: T7

**Done when**:
- [ ] route renders inside shell
- [ ] page has distinct title/copy/sections
- [ ] active nav works for settings route
- [ ] settings page ownership is isolated inside `modules/settings/**`

---

### T9: Update redirect targets and protected-entry flows

**What**: Replace remaining `/dashboard` assumptions with `/app` where the authenticated entry target should now land.
**Where**: auth/login/onboarding/dashboard route integration points and shell integration files
**Depends on**: T8

**Done when**:
- [ ] login recovery/default redirect targets use `/app`
- [ ] onboarding completion redirects to `/app`
- [ ] `/dashboard` remains only as compatibility redirect
- [ ] no redirect loop or stale target remains

---

### T10: Add verification for shell, routes, and gating

**What**: Cover the new shell behavior and route migration with automated checks.
**Where**: app route/shell/page test files
**Depends on**: T9

**Done when**:
- [ ] `/dashboard` redirect to `/app` is tested
- [ ] protected access to `/app` is tested
- [ ] onboarding-required redirect from `/app` is tested
- [ ] active nav state is tested
- [ ] placeholder routes render distinct content
- [ ] `npx tsc --noEmit`, `pnpm lint`, and relevant tests pass
