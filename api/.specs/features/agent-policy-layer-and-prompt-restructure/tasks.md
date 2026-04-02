# Tasks — Agent Policy Layer and Prompt Restructure

## Application

- `api/`

## Phase 1 — Prompt Standardization

1. Replace the XML-like prompt formatter with a Markdown-based shared section formatter.
2. Refactor `assistant-client.ts` to the new shared prompt shape without removing supported behaviors.
3. Refactor `assistant-owner.ts` to the new shared prompt shape without removing supported behaviors.
4. Refactor `assistant-onboarding.ts` to the new shared prompt shape without removing supported behaviors.
5. Update or add prompt unit tests covering all three agents.

## Phase 2 — Policy Infrastructure

1. Introduce shared policy types and interfaces under `src/modules/ai/policies/`.
2. Implement a generic `policy-gate.node.ts` that evaluates the latest assistant action before protected tool execution.
3. Update agent graph wiring so agents can register policies without hardcoding them into the gate.
4. Add tests for allowed and blocked policy outcomes.

## Phase 3 — First Policy Rollout

1. Implement `RequireExplicitConfirmationPolicy` for onboarding finalization using a deterministic recent-history heuristic, without introducing additional graph state in this phase.
2. Wire the onboarding agent to use that policy around `finishOnboarding`.
3. Implement `RequireConfirmationBeforeServiceRequestPolicy` for protected service-request actions.
4. Wire client and owner agents to use the service-request policy where applicable.
5. Add focused tests for onboarding blocking, including ambiguous/vague confirmation rejection, and service-request protection.

## Phase 4 — Client Scope Alignment

1. Define the source of truth for company-scope evaluation using known company context.
2. Implement conservative client-scope enforcement so unsupported offerings are not represented as available.
3. Ensure blocked or redirected out-of-scope behavior returns natural corrective guidance to the model.
4. Add tests for refusal, redirection, ambiguous scope, and repeated out-of-scope requests.

## Phase 5 — Context Preparation

1. Decide whether client flow needs `hydrateContext` immediately after prompt migration.
2. If needed, implement reusable context-preparation support for company, memory, and active confirmation summaries.
3. Extend `AgentContext` only with prepared fields that reduce prompt complexity materially.
4. Add tests covering hydrated context behavior.

## Phase 6 — Tool Hardening and Regression Coverage

1. Fix `updateServiceRequest` so computed updates are actually persisted.
2. Review protected tools and align local validations with the new policy flow.
3. Add or update regression tests to confirm capability parity for client, owner, and onboarding.
4. Run typecheck, lint, and relevant Vitest suites for the affected modules.

## Exit Criteria

1. `client`, `owner`, and `onboarding` prompts use the shared Markdown structure.
2. At least one business-critical invariant is enforced through the generic policy layer.
3. Onboarding cannot finalize without explicit confirmation, using a conservative deterministic policy and no extra graph state in this phase.
4. Client flow stays aligned with company scope and does not invent unsupported offerings.
5. Existing supported agent capabilities remain intact for current flows.
