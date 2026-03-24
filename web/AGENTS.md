## Documentation Instructions

- Read [../README.md](../README.md) for project overview and setup instructions
- Read [../.specs/project/PROJECT.md](../.specs/project/PROJECT.md) for project description, goals, and scope
- Read [../.specs/project/STATE.md](../.specs/project/STATE.md) for current project state and decisions
- Read [../.specs/project/ROADMAP.md](../.specs/project/ROADMAP.md) for milestones and planned features
- Read [.specs/codebase/ARCHITECTURE.md](.specs/codebase/ARCHITECTURE.md) for web app architecture
- Read [.specs/codebase/STRUCTURE.md](.specs/codebase/STRUCTURE.md) for web app directory structure
- Read [.specs/codebase/CONVENTIONS.md](.specs/codebase/CONVENTIONS.md) for coding style and conventions
- Read [.specs/codebase/TESTING.md](.specs/codebase/TESTING.md) for testing guidelines
- Read [.specs/codebase/INTEGRATIONS.md](.specs/codebase/INTEGRATIONS.md) for backend API integration contracts
- Read [.specs/codebase/STACK.md](.specs/codebase/STACK.md) for technology stack
- Keep documentation up to date with code changes

## Development Environment Instructions

- Install dependencies locally using: `pnpm install`
- Start dev server: `pnpm dev`
- Backend must be running for API calls: `docker compose up -d` from monorepo root
- Check package.json for available scripts

## Testing Instructions

- Add or update tests for the code you change, even if nobody asked
- Run `npx tsc --noEmit` to check for type errors
- Run `pnpm lint` to check for linting errors
- Always run all tests and check for type errors before committing