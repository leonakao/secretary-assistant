# Design — Agent Policy Layer and Prompt Restructure

## Scope

Affected application:

- `api/`

Not affected in this phase:

- `web/` — no agent orchestration or prompt execution lives in the SPA today

This design improves existing agent flows first. New nodes and abstractions are introduced only where they simplify or harden behavior already required by the approved spec.

## Goals

- replace XML-like prompt formatting with a shorter shared prompt structure
- preserve capability parity for `client`, `owner`, and `onboarding`
- enforce critical workflow rules outside prompt text where needed
- keep the new policy layer reusable but not overly rigid
- keep rollout incremental so each agent can migrate safely

## Current State

Today each agent builds a LangGraph flow around:

`START -> detectTransfer -> assistant <-> tools -> END`

Client and owner also route to `requestHuman`.

Behavioral constraints currently live mostly in prompt text:

- memory usage expectations
- confirmation sequencing
- tool-use discipline
- onboarding completion behavior
- client scope alignment with the company

This makes behavior fragile because enforcement depends on model obedience.

## Proposed Architecture

### 1. Shared prompt structure

All three agents move to the same Markdown-based prompt shape:

1. `Role`
2. `Objective`
3. `Business Context`
4. `Conversation State`
5. `Response Guidelines`
6. `Tool Usage`
7. `Agent-Specific Rules`

This replaces the current XML-like wrapper format.

The structure is shared, but content remains agent-specific:

- `client`: customer support, company-scope alignment, confirmation-aware handling
- `owner`: operational support, company management, confirmations and service requests
- `onboarding`: guided interview, progressive collection, explicit finish confirmation

### 2. Prompt builder split

Replace the current single XML-oriented builder with:

- a small shared prompt formatter that renders Markdown sections
- per-agent prompt builders that prepare section content

This keeps prompts standardized without forcing all agents into a rigid shared wording model.

### 3. Shared policy-gate infrastructure

Introduce a generic `policy gate` node that evaluates the last assistant action before protected tool execution.

The gate itself stays generic. Agent-specific behavior comes from injected policies.

Flow shape after migration:

`START -> [optional context-prep nodes] -> assistant -> policyGate -> tools -> assistant -> END`

For onboarding, the same gate can block `finishOnboarding`.

### 4. Optional reusable context-preparation layer

Introduce reusable context-preparation nodes only where they reduce prompt burden materially.

Initial candidate:

- `hydrateContext` for the client flow

Responsibilities:

- prepare company context summary
- prepare memory summary for relevant namespaces
- prepare active confirmation summary
- expose prepared fields in `AgentContext`

This avoids forcing the prompt to instruct the model to manually do all context fetching.

### 5. Tool-level hardening

Critical invariants still belong close to execution.

The policy layer prevents invalid planned actions.
The tools still validate arguments and execution-local constraints.

This avoids turning the policy system into a giant centralized rules engine.

## Policy Contract

Create a small reusable contract under `src/modules/ai/policies/`.

Suggested types:

```ts
export interface AgentPolicy {
  name: string;
  evaluate(params: PolicyEvaluationParams): Promise<PolicyDecision>;
}

export interface PolicyEvaluationParams {
  state: typeof AgentState.State;
  lastAssistantMessage: AIMessage;
}

export type PolicyDecision =
  | { allow: true }
  | {
      allow: false;
      reason: string;
      remediation: string;
      metadata?: Record<string, unknown>;
    };
```

Suggested node behavior:

- inspect the latest `AIMessage`
- if there are no tool calls, continue normally
- run all configured policies
- if no policy blocks, route to `tools`
- if one or more policies block:
  - do not execute the protected tool calls
  - inject `ToolMessage` feedback for the model
  - return to `assistant`

The gate should not know business rules like “finish onboarding” or “service requests need confirmation”.
Those belong in policies.

## Initial Policies

### `RequireExplicitConfirmationPolicy`

Primary first use:

- `onboarding` blocks `finishOnboarding` unless the recent conversation includes explicit finalization confirmation

Expected behavior:

- run only when the assistant attempts `finishOnboarding`
- inspect only the recent conversation window
- accept only confirmations that are both explicit and contextually tied to finalizing onboarding
- block ambiguous confirmations
- tell the assistant to ask for explicit confirmation before retrying the tool

Design refinement for this phase:

- do not introduce additional graph state such as `...ConfirmationRequestedAt`
- keep the first implementation deterministic, simple, and conservative
- if the recent-history heuristic is insufficient in practice, explicit graph state may be reconsidered in a later iteration

### `RequireConfirmationBeforeServiceRequestPolicy`

Primary first use:

- `client`
- `owner`

Expected behavior:

- block protected service-request actions when the flow requires prior confirmation
- return corrective guidance instead of executing the tool call

### `EnforceCompanyScopeAlignmentPolicy`

Primary first use:

- `client`

Expected behavior:

- when the assistant attempts to represent unsupported offerings as if they exist, block that path
- instruct the model to decline and redirect toward actual known offerings

This policy should be conservative. It should rely on known company context, not on broad semantic speculation.

## Agent-by-Agent Design

### Client agent

Files primarily impacted:

- `src/modules/ai/agents/client-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-client.ts`
- `src/modules/chat/strategies/client-conversation.strategy.ts`
- `src/modules/ai/tools/create-service-request.tool.ts`
- `src/modules/ai/tools/update-service-request.tool.ts`

Changes:

- adopt shared Markdown prompt structure
- include explicit company context and prepared state summaries
- add `policyGate` before tools
- optionally add `hydrateContext` before `assistant`
- enforce company-scope alignment using known company description and prepared context
- preserve current ability to answer, gather information, confirm, search/update records, and escalate

Client-specific note:

The client agent should not become a broad general assistant. It represents the company. If the request is outside company scope, it must refuse or redirect instead of improvising unsupported offerings.

### Owner agent

Files primarily impacted:

- `src/modules/ai/agents/owner-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-owner.ts`

Changes:

- adopt shared Markdown prompt structure
- move sequencing-critical rules out of prompt where appropriate
- support policy registration for protected business actions

The owner flow likely needs fewer restrictions than the client flow, so policies must be opt-in and scoped.

### Onboarding agent

Files primarily impacted:

- `src/modules/ai/agents/onboarding-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-onboarding.ts`
- `src/modules/ai/tools/finish-onboarding.tool.ts`

Changes:

- adopt shared Markdown prompt structure
- preserve guided interview behavior
- add policy enforcement for finalization confirmation
- keep onboarding-specific step guidance in the prompt, but move the “must not finish without explicit confirmation” rule into policy enforcement

Onboarding confirmation enforcement in this phase:

- no additional state-tracking field is introduced in the graph
- the policy evaluates only attempted `finishOnboarding` calls
- the decision is based on recent conversational evidence, using an intentionally conservative matcher
- on uncertainty, the action is blocked and the assistant is instructed to ask for a clear confirmation

## Prompt Content Boundaries

What remains in prompts:

- persona and tone
- high-level objective
- business context
- current conversation state
- customer-safe response guidelines
- minimal model guardrails

What moves out of prompts:

- critical action sequencing
- protected action precondition enforcement
- mandatory finalization checks
- any rule better expressed as a reusable validator or planner guard

What may remain hybrid:

- memory usage guidance
- “one question at a time”
- concise style constraints

These are response-quality concerns, not hard business invariants.

## Avoiding Excessive Rigidity

To keep the design reusable without over-abstracting:

- policies are attached per agent
- each policy focuses on one narrow business invariant
- context-prep nodes are optional and composable
- tools keep execution-local validation
- prompt builders stay per-agent even though they share the same section format

This avoids creating a universal agent engine while still extracting the parts that are actually shared.

## Capability Parity Strategy

Capability parity will be protected through migration sequencing:

1. replace prompt format without changing tool availability
2. keep prompts semantically equivalent before tightening rules
3. introduce policies only for explicitly approved invariants
4. validate each agent flow against current supported behavior

The prompt simplification must not silently drop capabilities. Any intentional behavior tightening must map back to the approved spec.

## Migration Plan

### Step 1 — Prompt architecture

- implement shared Markdown prompt formatter
- migrate `client`, `owner`, and `onboarding` prompts
- keep behavior as close as possible to current flow

### Step 2 — Policy infrastructure

- introduce generic policy interfaces
- introduce `policyGate` node
- wire registration per agent

### Step 3 — First concrete policy rollout

- onboarding: explicit confirmation before `finishOnboarding`
- client/owner: protected service-request sequencing

For onboarding, the first rollout should prefer a deterministic recent-history heuristic over adding new graph state.
Additional state should only be introduced later if production behavior shows the heuristic is not sufficient.

### Step 4 — Context preparation

- add `hydrateContext` for client if needed after prompt migration
- expose prepared summaries in `AgentContext`

### Step 5 — Tool hardening and cleanup

- harden tool outputs and validations
- remove prompt instructions made obsolete by structure

## Impacted Modules and Files

Shared AI infrastructure:

- `src/modules/ai/agents/agent.state.ts`
- `src/modules/ai/nodes/assistant.node.ts`
- new `src/modules/ai/nodes/policy-gate.node.ts`
- optional new `src/modules/ai/nodes/hydrate-context.node.ts`
- new `src/modules/ai/policies/*`
- `src/modules/ai/agent-prompts/prompt-builder.ts`

Client:

- `src/modules/ai/agents/client-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-client.ts`
- `src/modules/chat/strategies/client-conversation.strategy.ts`

Owner:

- `src/modules/ai/agents/owner-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-owner.ts`

Onboarding:

- `src/modules/ai/agents/onboarding-assistant.agent.ts`
- `src/modules/ai/agent-prompts/assistant-onboarding.ts`
- `src/modules/ai/tools/finish-onboarding.tool.ts`

Protected tools:

- `src/modules/ai/tools/create-service-request.tool.ts`
- `src/modules/ai/tools/update-service-request.tool.ts`

## Risks and Mitigations

Risk:

- new abstractions become too generic and hard to reason about

Mitigation:

- ship only the minimum shared contracts needed for current agents

Risk:

- prompt simplification removes implicit behaviors

Mitigation:

- migrate prompts first with parity-focused tests before adding stricter policies

Risk:

- company-scope enforcement becomes too aggressive

Mitigation:

- scope policy should be conservative and rely on known context; uncertain cases should ask a clarifying question or decline safely

Risk:

- policy gate duplicates tool validation

Mitigation:

- gate handles cross-step business invariants; tools handle local execution validity

## Validation Implications

Required test focus:

- prompt builder tests for all three agents
- policy tests per policy
- graph tests for blocked and allowed action flows
- onboarding tests for explicit confirmation enforcement
- onboarding tests for vague or ambiguous responses being blocked without relying on extra graph state
- client tests for out-of-scope request refusal/redirection
- regression checks for existing agent behaviors

## Recommendation

Proceed with implementation only in `api/`.

Implementation should be split into narrow phases:

1. prompt standardization
2. policy infrastructure
3. onboarding finish protection
4. client/owner protected-action policies
5. optional client context hydration

This keeps the rollout testable and minimizes behavioral regression risk.
