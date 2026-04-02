# Contacts Admin Page API Tasks

## Implementation Order

1. Create contacts management response types in
   `api/src/modules/contacts/use-cases/contacts-management.types.ts`.
2. Add request DTOs in `api/src/modules/contacts/dto/` for pagination and
   ignore updates.
3. Implement `ListManagedContactsUseCase`.
4. Implement `GetManagedContactDetailUseCase`.
5. Implement `UpdateManagedContactIgnoreUntilUseCase`.
6. Add `contacts-me.controller.ts` with authenticated routes.
7. Update `contacts.module.ts` with repositories, controllers, and providers.
8. Add or update unit/controller tests for list, detail, ignore update, and
   company isolation.
9. Run API test suite for the touched files.

## Ownership Notes

- Keep all work inside `api/src/modules/contacts/**` where possible.
- Reuse existing company-management ownership resolution helpers instead of
  creating parallel access-control logic.
- Avoid schema changes in v1; build on `contacts.ignoreUntil` and
  `memories.sessionId`.
