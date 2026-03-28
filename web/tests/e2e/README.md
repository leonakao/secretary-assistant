# Onboarding Validation E2E

The onboarding validation flow runs against a dedicated web/API stack and does not assume the default local dev ports.

## Environment

- `ONBOARDING_VALIDATION_BASE_URL`
  Default: `http://127.0.0.1:4173`
- `ONBOARDING_VALIDATION_WEB_PORT`
  Default: `4173`
- `ONBOARDING_VALIDATION_API_BASE_URL`
  Default: `http://127.0.0.1:3300`

Playwright injects `VITE_E2E_AUTH_MOCK=true` for this run so `/login?mode=signup` creates a unique deterministic browser identity that matches the API `e2e.<base64url-json-claims>` contract.

## Commands

```bash
pnpm test:e2e:onboarding-validation
```

To run the full Playwright suite against the dedicated stack:

```bash
pnpm test:e2e
```

The committed company briefing fixture used by the onboarding validation flow is:

```text
web/tests/e2e/fixtures/onboarding-company-briefing.md
```

## Artifacts

Each run writes analyzable evidence to:

```text
web/test-results/onboarding-validation/<run-id>/
```

Artifacts include:

- `briefing-source.md`
- `briefing.json`
- `report.json`
- `summary.md`
- `transcript.md`
