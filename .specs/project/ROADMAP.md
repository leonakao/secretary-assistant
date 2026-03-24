# Roadmap

## Milestone 1 — Core AI Agent (API) ✅ In Progress

Core WhatsApp ↔ AI agent pipeline.

- [x] NestJS project structure + Docker setup
- [x] PostgreSQL + pgvector + TypeORM + migrations
- [x] Evolution API integration (send/receive messages)
- [x] LangGraph agent framework (StateGraph + tool nodes)
- [x] Three agent modes: ClientAssistant, OwnerAssistant, OnboardingAssistant
- [x] Conversation memory (PostgresSaver checkpointer + PostgresStore)
- [x] Tool suite: service requests, contacts, confirmations, memory, send-message
- [x] Conversation strategies: client, owner, onboarding routing
- [ ] Complete entity implementations (most module subdirs still empty)
- [ ] Unit tests for agents, tools, use-cases, services

## Milestone 2 — Web Dashboard (React SPA)

Configuration UI for business owners.

- [ ] Scaffold `web/` React SPA (Vite + TypeScript)
- [ ] Authentication (owner login)
- [ ] Agent configuration (personality, system prompt, business info)
- [ ] WhatsApp connection management (QR code, session status)
- [ ] Conversation history view
- [ ] Service request management view
- [ ] Contact management view

## Milestone 3 — Onboarding Flow

Guided setup experience for new businesses.

- [ ] Onboarding conversation flow via WhatsApp
- [ ] Company profile setup through OnboardingAssistantAgent
- [ ] FinishOnboarding tool integration and step tracking
- [ ] Dashboard onboarding wizard (web)

## Milestone 4 — Hardening & Production Readiness

- [ ] Comprehensive test coverage (unit + integration)
- [ ] Error handling and retry logic for Evolution API
- [ ] Rate limiting / message throttling
- [ ] Observability (logging, structured errors)
- [ ] Deployment setup (CI/CD)
