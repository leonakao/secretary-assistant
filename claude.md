# Claude Project Guidelines

## Documentation Rules

**IMPORTANT**: Do NOT create `.md` documentation files, except for the main `README.md`.

- ❌ Do NOT create files in a `docs/` folder
- ❌ Do NOT create additional markdown documentation files
- ❌ Do NOT create files like `IMPLEMENTATION_SUMMARY.md`, `QUICK_START.md`, etc.
- ✅ Only update the main `README.md` when necessary

## Code Guidelines

- Follow existing code patterns and architecture
- Use TypeScript strict mode
- Maintain consistent naming conventions
- Keep business logic in services
- Use dependency injection properly

## Database

- Prefer `varchar` columns over database `enum` types for easier extensibility
- Always create migrations for schema changes
- Use JSONB for flexible/dynamic data structures

## Project Structure

- Follow NestJS module structure
- Keep related code together in feature modules
- Export public APIs through module index files
