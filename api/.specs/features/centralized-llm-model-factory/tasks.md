# Centralized LLM Model Factory Tasks

## Phase 3 Implementation

### Task 1: Add centralized chat-model factory

Create the API factory/provider in `src/modules/ai/` with the public contract:

`getLlmModel(type: 'helper' | 'user-interaction')`

Requirements:

- reads `OPENAI_API_KEY`
- maps `user-interaction` to `gpt-5-mini`
- maps `helper` to `gpt-5-nano`
- contains the only chat-model assignment logic for this feature

### Task 2: Add OpenAI LangChain dependency

Update `api/package.json` to include the required LangChain OpenAI package and supporting config if needed.

Add the official OpenAI SDK as needed for the transcription API integration.

### Task 3: Register factory in AiModule

Update `src/modules/ai/ai.module.ts` so the factory/provider is available to AI agents and services.

### Task 4: Refactor assistant agents to use the factory

Update these files to request `user-interaction` models through the factory:

- `src/modules/ai/agents/client-assistant.agent.ts`
- `src/modules/ai/agents/owner-assistant.agent.ts`
- `src/modules/ai/agents/onboarding-assistant.agent.ts`

Requirements:

- remove direct provider-specific model construction
- remove duplicated API key lookup from those constructors
- preserve current tool-binding and graph behavior

### Task 5: Refactor LangchainService to use the factory

Update `src/modules/ai/services/langchain.service.ts` to request models through the factory instead of constructing them inline.

Default behavior for this feature:

- service-level generic helpers use the `helper` model category

### Task 6: Widen shared node typings if necessary

If shared graph nodes or helpers still depend on `ChatGoogleGenerativeAI` types, refactor them to use provider-agnostic LangChain types so the factory can supply OpenAI models cleanly.

Likely files:

- `src/modules/ai/nodes/assistant.node.ts`
- `src/modules/ai/nodes/detect-transfer.node.ts`

### Task 7: Add tests

Add unit tests for the new factory and any updated constructor/config behavior.

Minimum checks:

- correct model returned for `helper`
- correct model returned for `user-interaction`
- clear failure when `OPENAI_API_KEY` is missing
- no direct provider imports remain in migrated call sites

Add tests for `AudioTranscriptionService` covering:

- supported MIME type success path with mocked OpenAI transcription client
- missing `OPENAI_API_KEY`
- unsupported MIME type rejection

### Task 8: Migrate audio transcription to OpenAI

Update `src/modules/ai/services/audio-transcription.service.ts` to use OpenAI's dedicated transcription API instead of Gemini multimodal prompting.

Requirements:

- keep the existing public service contract
- keep MIME normalization and validation
- do not route transcription through `getLlmModel(...)`
- keep model selection localized to the transcription service

### Task 9: Update integration docs

Update API integration documentation after implementation so the AI integration section reflects centralized OpenAI chat-model selection and the explicit out-of-scope status of embeddings/audio.

## Phase 4 Review

Run review focused on:

- missed provider-specific bypasses
- broken LangGraph tool-binding behavior
- incorrect helper vs user-interaction categorization
- untested missing-config paths
- transcription integration that incorrectly depends on the chat-model factory

## Phase 5 QA

Minimum QA checks:

- `pnpm test`
- `pnpm lint`
- `npx tsc --noEmit`

Targeted runtime verification:

- instantiate each assistant successfully
- confirm onboarding and assistant flows still create tool-capable models
- confirm audio transcription service initializes and parses OpenAI transcription responses correctly
