# Contacts Admin Page Web Tasks

## Implementation Order

1. Add route-level loader and search-param parsing to
   `web/app/routes/app.contacts.tsx`.
2. Create `web/app/modules/contacts/api/contacts.api.ts` with list, detail, and
   ignore update wrappers plus tests.
3. Replace the placeholder page in
   `web/app/modules/contacts/pages/contacts-page/index.tsx` with the real
   loader-backed page contract.
4. Add page-private components for:
   - list panel
   - pagination
   - detail panel
   - conversation timeline
   - ignore controls
   - skeleton and empty states
5. Wire URL-driven selection and pagination behavior.
6. Wire ignore update actions with local pending and error states.
7. Add/adjust tests for route data rendering, selection, pagination, and ignore
   updates.
8. Run web tests, lint, and `tsc --noEmit`.

## Ownership Notes

- Keep the feature encapsulated under `web/app/modules/contacts/**` and
  `web/app/routes/app.contacts.tsx`.
- Do not introduce a second contacts detail route in v1.
- Preserve the authenticated shell layout and bottom navigation behavior.
