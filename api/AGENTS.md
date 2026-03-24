## Documentation Instructions

- Read [README.md](README.md) for project overview and setup instructions
- Read [../.specs/project/PROJECT.md](../.specs/project/PROJECT.md) for project specifications and guidelines
- Read [../.specs/project/STATE.md](../.specs/project/STATE.md) for project state and technical decisions
- Read [../.specs/project/ROADMAP.md](../.specs/project/ROADMAP.md) for project roadmap and milestones
- Read [.specs/codebase/ARCHITECTURE.md](.specs/codebase/ARCHITECTURE.md) for project architecture decisions
- Read [.specs/codebase/STRUCTURE.md](.specs/codebase/STRUCTURE.md) for project codebase structure
- Read [.specs/codebase/CONVENTIONS.md](.specs/codebase/CONVENTIONS.md) for project coding style and conventions
- Read [.specs/codebase/TESTING.md](.specs/codebase/TESTING.md) for project testing guidelines
- Read [.specs/codebase/INTEGRATIONS.md](.specs/codebase/INTEGRATIONS.md) for project integration guidelines
- Read [.specs/codebase/STACK.md](.specs/codebase/STACK.md) for project technology stack
- Read [.specs/features/](.specs/features/) for old feature specifications
- Keep documentation up to date with code changes

## Development Environment Instructions

- Execute migration inside docker container using: `docker compose exec api pnpm migration:run`
- Install dependencies locally using: `pnpm install`
- Rebuild docker container after installing dependencies using: `docker compose up -d -V --build`
- Check package.json for available scripts

## Testing instructions

- Add or update tests for the code you change, even if nobody asked
- Init the application with `docker compose up -d` before running integration tests
- Run `npx tsc --noEmit` to check for type errors
- Run `pnpm lint` to check for linting errors
- Always run all tests and check for type errors before committing

