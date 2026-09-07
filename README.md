# AI Money Guardian 🛡️

> **Your money. Your rules. Your AI.**

AI Money Guardian is a privacy-first financial agent designed to become a **trust layer between people, AI agents and money**.

It starts with “Can I afford this?” and expands into money health, goals, life-decision simulation, scam detection and financial-agent security.

## Product modules

- ✦ **Guardian Desk** — explainable purchase decisions.
- ◉ **Money Health** — financial health and spending pressure.
- ◎ **Goal Engine** — turn savings goals into monthly plans.
- ◇ **Life Simulator** — explore moving out, buying a car, holidays and career decisions.
- 🛡 **Security Center** — agent identity, permissions and action boundaries.
- 🚨 **Scam Guard** — detect social-engineering signals in suspicious messages.
- 📜 **Auditability** — timestamped decision and agent metadata.
- 🔐 **Selective disclosure** — use derived attributes instead of exposing raw financial records where possible.

## Product principle

**An AI should not need to know everything about you to help protect your money.**

The current prototype uses derived attributes such as income band, commitment ratio, safe-spend limit and emergency-fund target. It deliberately keeps exact salary, bank-account details, raw transaction history and identity numbers outside the decision payload.

This is a privacy/product architecture principle, not a claim that every future feature can operate without underlying financial data.

## Architecture

```text
                         AI MONEY GUARDIAN
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
        MONEY INTELLIGENCE   SECURITY LAYER       ACTION LAYER
             │                    │                    │
       Health · Goals       Identity · Policy     Future workflows
       Simulator · Risk     Consent · Scam        Payments · Bills
             │                    │                    │
             └────────────┬───────┘                    │
                          ▼                            │
                   T3N AGENT IDENTITY                 │
                          │                            │
                    T3N TEE / POLICY  ← planned       │
                          │                            │
                    Protected proof ──────────────────┘
```

The current app uses the T3N SDK server-side for testnet authentication. The deeper TEE-backed policy boundary is intentionally separated so privileged secrets never reach browser JavaScript.

## Current decision engine

Four illustrative checks are evaluated server-side:

1. Safe-spend limit
2. Commitment ratio
3. Emergency-fund protection
4. Purchase category risk

Results are **APPROVED**, **CAUTION** or **DENIED** with explainable checks and audit metadata.

These rules are illustrative personal-finance planning logic, **not professional financial advice**.

## T3N integration

With a testnet key configured, the server performs the T3N handshake, authenticates the agent, receives a `did:t3n` identity and verifies it against `T3N_DID` when supplied. The T3N API key remains server-side.

## Public-launch roadmap

### Phase 1 — Personal finance intelligence
- Manual financial profile
- Purchase Guardian
- Money Health
- Savings Goals
- Life Simulator
- Scam Guard

### Phase 2 — Private data ingestion
- CSV / statement import
- Transaction categorization
- Recurring-payment detection
- Cash-flow forecasting
- User-controlled private vault

### Phase 3 — Agent security
- Verifiable agent identity
- Permission scopes
- Consent management
- Policy-controlled actions
- Protected computation
- Tamper-evident audit trail

### Phase 4 — Autonomous workflows
- Bill preparation
- Subscription management
- Savings automation
- Payment preparation
- User approval gates
- Policy-enforced execution

Real financial-account connectivity should only be introduced after appropriate security, privacy, compliance and provider-integration review.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` for live T3N authentication. Never commit `.env` or a real API key.

Without a key, the app runs in clearly labelled demo mode.

## Security principles

- Secrets stay server-side.
- `.env` is ignored by Git.
- Request bodies are size-limited.
- Purchase values are validated server-side.
- T3N identity can be checked against an expected DID.
- No real bank credentials should be used in development.
- Before handling real financial data, add authentication, encryption at rest, consent management, deletion/export controls, rate limiting, monitoring and formal security review.

## Status

**Public product foundation / early alpha.**

The current release is deliberately honest about what is implemented today versus what belongs in the production TEE and financial-connectivity layers.

## License

MIT
