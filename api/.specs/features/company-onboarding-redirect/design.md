# Company Onboarding Redirect

## Overview

The API must become the source of truth for authenticated routing and onboarding progress. The web app should not infer readiness from Auth0 alone. Instead, it should consume an API contract that answers:

- does this user have a related company?
- if yes, is that company still onboarding or ready for the dashboard?
- if onboarding is incomplete, what is the next step and how does the user resume it?

The implementation should reuse the existing onboarding domain behavior already present in the WhatsApp path:

- `OnboardingConversationStrategy`
- `OnboardingAssistantAgent`
- `FinishOnboardingTool`
- existing company `step` state on `Company`

## Existing Domain Anchors

- `api/src/modules/companies/entities/company.entity.ts`
  - already includes `step: 'running' | 'onboarding'`
- `api/src/modules/users/controllers/users-me.controller.ts`
  - current authenticated user contract is too shallow for routing decisions
- `api/src/modules/chat/strategies/onboarding-conversation.strategy.ts`
  - existing onboarding conversation orchestration
- `api/src/modules/ai/agents/onboarding-assistant.agent.ts`
  - existing onboarding agent graph
- `api/src/modules/ai/tools/finish-onboarding.tool.ts`
  - marks the company as `running` and enables support

## Design Goals

1. Keep onboarding routing state in backend-owned contracts.
2. Reuse existing onboarding assistant behavior instead of duplicating it for web.
3. Decouple onboarding conversation logic from WhatsApp transport enough to serve both web chat and webhook chat.
4. Make onboarding creation and resume idempotent.
5. Preserve clear transitions from `onboarding` to `running`.

## State Model

### Canonical Company State

Current model:
- `company.step = 'onboarding' | 'running'`

Recommended API-facing interpretation:
- `onboardingRequired = true` when the authenticated user has no company relation
- `onboardingStep = 'company-bootstrap'` when no company relation exists yet
- `onboardingStep = 'assistant-chat'` when the user has a related company with `step = 'onboarding'`
- `onboardingStep = 'complete'` when the user has a related company with `step = 'running'`

This avoids an immediate migration while still giving the web app a richer routing contract.

### Relation Rule

Recommended rule:
- a user is "related to a company" when a `user_companies` record exists for that user and the company is not deleted

For this feature, assume one active company per owner in the onboarding flow. If multiple relations are ever possible, the contract should still resolve to one primary company for authenticated routing.

## API Contract Changes

### Extend `GET /users/me`

Current response only returns user profile fields. That is insufficient for route decisions.

Recommended response additions:

```ts
interface UsersMeResponse {
  id: string;
  authProviderId: string | null;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
    role: 'owner' | 'admin' | 'employee';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
}
```

Behavior:
- no company relation -> `company: null`, `onboarding.requiresOnboarding: true`, `onboarding.step: 'company-bootstrap'`
- onboarding company -> `company` populated, `requiresOnboarding: true`, `step: 'assistant-chat'`
- completed company -> `company` populated, `requiresOnboarding: false`, `step: 'complete'`

### New Onboarding Bootstrap Endpoint

Recommended endpoint:
- `POST /onboarding/company`

Purpose:
- create the company in onboarding mode
- attach the authenticated user to the company
- return the onboarding routing contract required by the web app

Request:

```ts
interface CreateOnboardingCompanyRequest {
  name: string;
  businessType: string;
  ownerDisplayName?: string;
  phone?: string;
}
```

Response:

```ts
interface CreateOnboardingCompanyResponse {
  company: {
    id: string;
    name: string;
    step: 'onboarding';
  };
  onboarding: {
    requiresOnboarding: true;
    step: 'assistant-chat';
  };
}
```

Rules:
- authenticated only
- idempotent for the current user while an onboarding company already exists
- must not create duplicate onboarding companies on double-submit or refresh

### New Onboarding State Endpoint

Recommended endpoint:
- `GET /onboarding/state`

Purpose:
- allow the onboarding page to resolve the current step on first render
- provide a stable bootstrap contract for resume behavior

Response:

```ts
interface OnboardingStateResponse {
  company: {
    id: string;
    name: string;
    step: 'onboarding' | 'running';
  } | null;
  onboarding: {
    requiresOnboarding: boolean;
    step: 'company-bootstrap' | 'assistant-chat' | 'complete';
  };
  conversation: {
    threadId: string | null;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
  } | null;
}
```

Notes:
- if `company` is null, the web shows step 1
- if `company.step = onboarding`, the web shows step 2 and existing messages
- if `company.step = running`, the web redirects to dashboard

### New Onboarding Chat Message Endpoint

Recommended endpoint:
- `POST /onboarding/messages`

Purpose:
- send a user message into the onboarding flow
- reuse the existing onboarding assistant logic
- return the assistant reply and updated conversation state

Request:

```ts
interface SendOnboardingMessageRequest {
  message: string;
}
```

Response:

```ts
interface SendOnboardingMessageResponse {
  company: {
    id: string;
    step: 'onboarding' | 'running';
  };
  onboarding: {
    requiresOnboarding: boolean;
    step: 'assistant-chat' | 'complete';
  };
  assistantMessage: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
}
```

If the onboarding tool finishes during processing:
- return `company.step = 'running'`
- return `onboarding.requiresOnboarding = false`
- return `onboarding.step = 'complete'`

## Reuse / Refactor Strategy

### Problem

Current onboarding orchestration is transport-shaped around WhatsApp:
- presence notifications
- `remoteJid`
- `instanceName`
- webhook entry point

That logic is not a good direct fit for web chat transport.

### Recommendation

Extract a transport-neutral onboarding application service.

Proposed responsibilities:
- load authenticated user and company context
- append user message to memory
- execute `OnboardingAssistantAgent`
- collect the assistant response
- persist the assistant response
- expose completion state

Suggested service shape:

```ts
interface RunOnboardingConversationInput {
  userId: string;
  companyId: string;
  message: string;
  channel: 'whatsapp' | 'web';
}
```

Suggested outputs:
- assistant message text
- updated onboarding state
- optional completion flag

Then:
- WhatsApp strategy adapts that service and still performs presence/send side effects
- Web onboarding controller adapts the same service without WhatsApp-specific side effects

### Thread Identity

Recommended thread identity:
- stable thread per `{userId, companyId, purpose=onboarding}`

The current onboarding logic already uses `threadId = userId`. For web support, validate whether `userId` alone is safe if one user can only own one active onboarding company. If that assumption may change, introduce a more explicit thread key format:

- `onboarding:${companyId}:${userId}`

## Route/Guard Implications

The API must support these frontend decisions:

- `/login` can redirect to `/dashboard` only when `requiresOnboarding = false`
- `/dashboard` must deny incomplete users by signaling onboarding required
- `/onboarding` must resume step 1 or step 2 based on `GET /onboarding/state`

No server-side redirect is required in the API, but the API contracts must be unambiguous enough for route guards in `web/`.

## Validation Rules

### Bootstrap Form

- `name` required
- `businessType` required
- reject creation if the user already has a completed company and the product does not allow multi-company onboarding
- if an onboarding company already exists for the user, return it instead of creating another

### Chat

- authenticated user must already be attached to the onboarding company
- reject chat send when no onboarding company exists
- reject chat send when company is already `running`

## Risks and Mitigations

### Existing onboarding logic is coupled to WhatsApp

Risk:
- web chat implementation duplicates onboarding behavior

Mitigation:
- extract a shared onboarding conversation application service before adding the web controller

### Duplicate onboarding companies

Risk:
- bootstrap retries create inconsistent state

Mitigation:
- enforce a single active onboarding company per user until completion

### Ambiguous user-company selection

Risk:
- multiple company relations make route resolution inconsistent

Mitigation:
- define one primary company selection rule for authenticated routing

### Completion side effects are hidden inside the tool

Risk:
- frontend cannot reliably know when to transition

Mitigation:
- every onboarding chat response must return the refreshed onboarding status

## Testing Strategy

### Unit / Service Tests

- enriched `users/me` mapping for each user/company state
- bootstrap creation when no company exists
- bootstrap idempotency when onboarding company already exists
- onboarding chat service reuse across web and WhatsApp adapters
- completion transition after `finishOnboarding`

### Integration Tests

- `GET /users/me` for:
  - no company relation
  - onboarding company
  - running company
- `POST /onboarding/company`
- `GET /onboarding/state`
- `POST /onboarding/messages`
- chat resume with existing memory history

### Regression Tests

- WhatsApp onboarding still uses the same underlying domain behavior after extraction
- completion still updates company description, `step`, and support flags

## Execution Slices

### Slice 1: Routing Contract

- extend `GET /users/me`
- define onboarding state mapping

### Slice 2: Bootstrap Company

- create onboarding bootstrap endpoint
- attach user-company relation
- enforce idempotency

### Slice 3: Shared Onboarding Conversation Service

- extract transport-neutral onboarding execution service
- adapt WhatsApp strategy to use it

### Slice 4: Web Onboarding Endpoints

- add onboarding state endpoint
- add onboarding message endpoint

### Slice 5: Validation and Tests

- integration and regression coverage across all states
