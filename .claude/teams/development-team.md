# Development Team Setup

Use this prompt when creating a development team for cross-application work.

## Starter Prompt

```text
Create an agent team for development.

Team name: Development Team

Team structure:
- lead: delivery-lead
- teammates:
  - product-owner (creates specs in .specs/, copies to each application/service as needed)
  - architect (designs per application/service, creates application-specific design.md and tasks.md)
  - software-engineer (implements approved tasks, can spawn multiple times for parallel work across applications)
  - code-reviewer (code review of implementation)
  - qa-tester (defines test scenarios and implements integration tests)

Lead rules:
- act as the only role that negotiates scope with the user
- follow workflow instructions in this file
- **create new git branches from main as necessary** before implementation work begins (one per application if needed)
- enforce a spec-driven approval gate before implementation
- ask concise questions only when a risky assumption cannot be resolved locally
- announce phase changes and why each teammate is being engaged
- re-engage teammates as many times as necessary until the work is approved and validated
- route structural findings to architect
- route implementation findings to software-engineer when implementation starts
- shutdown teammates when their work is complete

Execution rules:
- start with specification work (product-owner creates specs in .specs/)
- **product-owner can ask architect for help identifying which applications/services are affected**
- coordinate copying specs to affected applications/services
- have architect design separately for each affected application/service
- do not begin implementation until spec, design, tasks, and user approval are in place
- **create new git branches from main as necessary** before implementation work (one per application/service if needed)
- spawn software-engineer once per affected application/service (can spawn multiple times for parallel work)
- keep teammate ownership narrow and avoid assigning the same file set to multiple teammates
- engage teammates by phase; do not activate implementation or QA work before the approval gate is satisfied
- when user requests changes, re-run the workflow from the beginning
```

## Repository-Specific Guidelines

**All agents must read AGENTS.md in the repository/application they are working on and follow those guidelines.**

Each repository/application (wrapper, services, etc.) has:
- Its own `AGENTS.md` with repository-specific instructions
- Its own documentation structure (README.md, `.specs/project/PROJECT.md`, testing guidelines, etc.)
- Its own branch naming conventions
- Its own testing and deployment instructions

## Workflow

- Product-owner creates all specs in `.specs/` (outside individual applications) first
- **Product-owner can consult with architect early to identify which applications (frontend, backend, or both) will be affected**
- Once approved, specs are copied to each affected application directory
- Architect creates **application-specific** `design.md` and `tasks.md` in each repository (uses relative paths within that repo)
- Do not begin implementation until spec, design, tasks, and user approval are in place
- Software-engineer works **one application/repository at a time** and reads that application's AGENTS.md
  - Can be spawned multiple times: one instance per affected application/service
  - Each instance follows the repository's guidelines and conventions
  - Implement one task at a time following the design plan created by the architect.
- Code-reviewer reviews **one application/repository at a time**, respecting that repo's documentation and review standards
- QA-tester reads the testing instructions specific to the application they are testing
- Deployment and merging are not agent responsibilities;

