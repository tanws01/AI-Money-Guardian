# AI Money Guardian 🛡️

> **Your money. Your rules. Your AI.**

AI Money Guardian is evolving from a spending checker into a **personal financial intelligence and trust layer** between people, AI agents and money.

The product loop is:

**Import → Understand → Model → Ask → Monitor → Decide → Protect → Act**

## What exists now

- ✦ **Financial Intelligence Hub** — import a CSV bank statement and derive cashflow, spending categories, net cashflow, savings rate, recurring-spend estimates and a financial-health score.
- ◈ **Natural-language Money Q&A** — ask questions and receive model-backed answers with confidence/evidence metadata.
- 🛡 **Guardian Desk** — explainable purchase decisions with policy checks.
- ◉ **Money Health** — a living view of income, expenses, surplus and runway.
- ◎ **Goal Engine** — goal-aware financial planning foundation.
- ◇ **Life Simulator** — stress-test major life decisions.
- 🚨 **Scam Guard** — detect social-engineering signals.
- 🔐 **Agent Control** — T3N identity, explicit permissions and blocked sensitive actions.
- ◈ **T3N Command Center** — makes the ADK trust layer visible: identity, TEE session, usage telemetry, policy preflight, delegation/revocation concepts and Agent Connect readiness.

## T3N ADK showcase

The product is intentionally designed to demonstrate the parts of T3N that matter for an autonomous financial agent.

### 1. Agent Auth — prove who the agent is

When `T3N_API_KEY` is configured, the server uses the T3N SDK to establish a session, perform the handshake and authenticate the Guardian to obtain a `did:t3n` identity. The UI displays the authenticated DID and can verify it against `T3N_DID`.

### 2. TEE session — establish a protected execution boundary

The live status panel exposes whether the T3N session was established. The application does not claim that local financial computations are automatically inside a TEE; protected computation requires the appropriate T3N contract/workflow.

### 3. Usage telemetry — make the T3N runtime observable

When the installed SDK exposes `getUsage()`, the Command Center shows available/reserved testnet credits and credit-exhaustion state.

### 4. Policy preflight — stop an action before it leaves the boundary

The Guardian runs an explicit preflight over identity, consent, amount and category policy. A sensitive action such as `bank.transfer` is visibly blocked unless the required authorization path exists.

### 5. Least privilege — give the agent only what it needs

The product models scoped functions, allowed actions/hosts, user consent and revocation. This follows T3N's delegation model rather than giving a financial agent blanket access.

### 6. Agent Connect — prepare the path to protected commerce

The UI exposes the intended pipeline:

**Signed intent → Agent Auth → policy → TEE placeholder resolution → protected execution → audit receipt**

The current release does **not** fake a payment or fake a ledger receipt. A real protected-contract integration must be configured before execution can be claimed.

### 7. Auditability — distinguish local evidence from T3N ledger evidence

Every demo decision/action gets a local audit ID. When a real protected T3N contract is integrated, the architecture is ready to attach the resulting protected execution receipt instead of inventing one.

## Product thesis

**An AI should not need to know everything about you to help protect your money.**

Guardian separates the **private financial model** from the **decision/action layer**. The long-term design is for an agent to prove facts such as “this purchase exceeds my policy” or “my emergency reserve remains protected” without unnecessarily exposing a user's full financial history.

## Architecture

```text
                         AI MONEY GUARDIAN
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
 PRIVATE MONEY MODEL         GUARDIAN REASONING          T3N TRUST LAYER
       │                          │                          │
 Transactions              Natural language             Agent Auth / DID
 Categories                 Decisions                    TEE Session
 Cashflow                   Goals                        Policy / Consent
 Recurring spend            Simulations                  Secrets boundary
 Forecasts                  Risk                         Audit / Connect
       │                          │                          │
       └───────────────┬──────────┴───────────┬──────────────┘
                       ▼                      ▼
                DERIVED ATTRIBUTES       PROTECTED ACTIONS
                       │                      │
                       └──────── T3N ────────┘
                         identity / policy /
                       future TEE workflows
```

## Intelligence roadmap

### Layer 1 — Financial understanding
- Statement ingestion
- Transaction normalization
- Merchant/category classification
- Income/expense detection
- Recurring-payment detection
- Cashflow model
- Savings-rate model
- Emergency runway
- Spending concentration

### Layer 2 — Financial reasoning
- Natural-language Q&A
- Affordability decisions
- Goal-aware recommendations
- Scenario simulation
- Forecasting
- “What changed?” explanations
- “What should I do next?” planning
- Confidence and evidence

### Layer 3 — Continuous Guardian
- New-transaction monitoring
- Unusual-spend alerts
- Subscription creep detection
- Budget-boundary alerts
- Emergency-buffer protection
- Goal drift detection
- Upcoming-bill awareness
- Monthly financial reviews

### Layer 4 — T3N-secured agent
- Verifiable agent identity
- Capability-scoped permissions
- Consent receipts
- Policy engine
- Human approval gates
- Protected secrets
- Protected computation
- Tamper-evident audit records
- Agent-to-agent trust

### Layer 5 — Autonomous money workflows
- Bill preparation
- Savings-transfer preparation
- Subscription cancellation workflows
- Payment-intent preparation
- Renewal reminders
- Multi-step financial tasks with explicit approval checkpoints
- Agent Connect protected execution

**Important:** `/api/action` and `/api/t3/preflight` are intentionally safety gates/demo infrastructure. They do not execute real payments. Production execution requires provider integration, strong authentication, transaction signing, risk controls, policy enforcement and independent security/compliance review.

## Privacy model

### Current alpha

- CSV is selected and parsed in the browser.
- Parsed transactions are sent to the local server to calculate a financial model.
- The demo server does not write uploaded statements to persistent storage.
- Browser local storage can retain parsed transactions for convenience; clear it before sensitive testing.
- T3N API credentials stay server-side.

### Production direction

Move the private model into authenticated encrypted storage and/or protected TEE computation with explicit consent scopes, deletion/export controls, data minimization, jurisdiction controls, key management and security review.

## Official T3N references

- T3N Sandbox / Agent Developer Kit: https://terminal3.io/products/agent-developer-kit
- T3 Network: https://terminal3.io/products/t3n
- T3N delegate access: https://docs.terminal3.io/t3n/data-owner-guide/delegate-access
- T3N overview: https://docs.terminal3.io/t3n/overview/why-t3n

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` for live T3N authentication. Never commit `.env` or a real API key.

Without a key, the product runs in clearly labelled demo mode.

## Security principles

- Secrets stay server-side.
- `.env` is ignored by Git.
- Request bodies are size-limited.
- Financial inputs are validated server-side.
- T3N identity can be checked against an expected DID.
- Sensitive actions are denied by default in the demo.
- No real bank credentials should be used in development.
- Before handling real financial data, add authentication, encryption at rest, consent management, deletion/export controls, rate limiting, monitoring, threat modeling and formal security review.

## Status

**Public product foundation / early alpha.**

The ambition is bigger than a budgeting dashboard: AI Money Guardian is being built as a **personal financial operating system with a verifiable AI trust boundary**.

## License

MIT
