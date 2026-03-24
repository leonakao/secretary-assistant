# Validate

**Goal**: Verify implementation meets spec AND coding principles.

## When to Validate

- After completing a user story (all tasks for P1, P2, etc.)
- After completing all tasks
- When user requests validation

---

## Process

### 1. Check Completed Tasks

Go through tasks.md:

- [ ] All tasks marked done?
- [ ] Any blocked or partial?

### 2. Verify Acceptance Criteria

For each user story in spec.md:

```markdown
### P1: [Story Title]

**Acceptance Criteria**:

1. WHEN [X] THEN [Y] → [PASS/FAIL]
2. WHEN [X] THEN [Y] → [PASS/FAIL]
```

### 3. Check Edge Cases

From spec.md edge cases:

- [ ] [Edge case 1] handled correctly
- [ ] [Edge case 2] handled correctly

### 4. Run Tests (if applicable)

```bash
# project test command
```

### 4.1 E2E Tests with Playwright (Recommended)

Use `playwright-cli` para validação E2E:

1. **Carregar contexto da feature** em `.specs/features/[feature]/`:
   - `spec.md` → derivar testes dos acceptance criteria
   - `design.md` → identificar componentes/rotas a validar
   - `tasks.md` → escopo do que foi alterado (risco de regressão)

2. **Executar testes**:
   ```bash
   pnpm dev   # em um terminal
   pnpm test:e2e:ui   # em outro (modo UI recomendado)
   # ou: pnpm test:e2e   # suíte completa headless
   ```

3. **Em falhas → Fix Loop**:
   - Classify: `feature-bug` vs `regression-bug`
   - Fix using Implement workflow (surgical, minimal)
   - Re-test (max 3 cycles)
   - See `.agents/rules/dev-test-loop.mdc` for full cycle details

4. **On all pass** → proceed to Code Quality Check

### 4.2 Developer-Driven Test Loop (No QCA)

Validação executada pelo mesmo desenvolvedor que implementou a feature:

1. Partir dos docs em `.specs/features/[feature]/`
2. Rodar E2E com `pnpm test:e2e:ui` (modo UI) ou `pnpm test:e2e` (headless)
3. Se falhar: consumir relatório e aplicar fixes via Implement
4. Re-executar testes que falharam, depois regressão completa

Fluxo contínuo: **Specify/Design/Implement (TLC) → Validate (playwright-cli) → Fix (TLC) → Retest (playwright-cli)**.

### 5. Code Quality Check (MANDATORY)

For each changed file, verify against [coding-principles.md](coding-principles.md):

| Check                                | Pass? |
| ------------------------------------ | ----- |
| No features beyond what was asked    |       |
| No abstractions for single-use code  |       |
| No unnecessary "flexibility" added   |       |
| Only touched files required for task |       |
| Didn't "improve" unrelated code      |       |
| Matches existing patterns/style      |       |
| Would senior engineer approve?       |       |

❌ Any "No"? → Fix before marking complete.

### 6. Report

---

## Validation Report Template

```markdown
# [Feature] Validation

**Date**: [YYYY-MM-DD]
**Spec**: `.specs/features/[feature]/spec.md`

---

## Task Completion

| Task | Status     | Notes   |
| ---- | ---------- | ------- |
| T1   | ✅ Done    | -       |
| T2   | ✅ Done    | -       |
| T3   | ⚠️ Partial | [Issue] |

---

## User Story Validation

### P1: [Story Title] ⭐ MVP

| Criterion     | Result  |
| ------------- | ------- |
| WHEN X THEN Y | ✅ PASS |
| WHEN A THEN B | ✅ PASS |

**Status**: ✅ P1 Complete

### P2: [Story Title]

| Criterion     | Result             |
| ------------- | ------------------ |
| WHEN X THEN Y | ❌ FAIL - [reason] |

**Status**: ⚠️ P2 Issues

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅     |
| Surgical changes | ✅     |
| No scope creep   | ✅     |
| Matches patterns | ✅     |

---

## Edge Cases

- [x] Edge case 1: Handled correctly
- [ ] Edge case 2: NOT handled - needs fix

---

## Tests

- **Ran**: [test command]
- **Result**: [X] passed, [Y] failed
- **Failures**: [list]

---

## Summary

**Overall**: ✅ Ready | ⚠️ Issues | ❌ Not Ready

**What works**:

- [List]

**Issues found**:

- [Issue 1]: [How to fix]

**Next steps**:

1. [Action]
```

---

## Tips

- **P1 first** - MVP must work before P2/P3
- **WHEN/THEN = Test** - Each criterion is a test case
- **Be specific** - "Doesn't work" isn't helpful
- **Recommend fixes** - Don't just report problems
- **Quality check is mandatory** - Not optional
