# AI Money Guardian 🛡️

> **Your money. Your rules. Your AI.**

AI Money Guardian is evolving from a spending checker into a **personal financial intelligence and trust layer** between people, AI agents and money.

The product loop is:

**Import → Understand → Model → Ask → Monitor → Decide → Protect → Act**

## What exists now

- ✦ **Financial Intelligence Hub** — import a CSV bank statement and derive cashflow, spending categories, net cashflow, savings rate, recurring-spend estimates and a financial-health score.
- ◈ **Natural-language Money Q&A** — ask questions such as “Where am I spending the most?” or “Can I save RM1,000 a month?” and receive model-backed answers with confidence/evidence metadata.
- 🛡 **Guardian Desk** — explainable purchase decisions with safe-spend, commitment, emergency-buffer and category-risk checks.
- ◉ **Money Health** — a living view of income, expenses, surplus and runway.
- ◎ **Goal Engine** — goal-aware financial planning foundation.
- ◇ **Life Simulator** — stress-test major life decisions.
- 🚨 **Scam Guard** — detect social-engineering signals in suspicious messages.
- 🔐 **Agent Control** — verifiable T3N identity, explicit permissions and blocked sensitive actions.
- 📜 **Auditability** — every decision/action response receives an audit identifier and agent metadata.
- 🧬 **Privacy boundary** — raw statement records can be processed to create a derived model; the demo does not persist uploaded statement files.

## The product thesis

**An AI should not need to know everything about you to help protect your money.**

Guardian separates the **private financial model** from the **decision layer**. The long-term architecture is designed so an agent can prove facts such as “commitments are below policy threshold” or “this purchase would break my emergency-fund rule” without unnecessarily exposing a user's full financial history.

## Architecture

```text
                         AI MONEY GUARDIAN
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
 PRIVATE MONEY MODEL         GUARDIAN REASONING          AGENT CONTROL
       │                          │                          │
 Transactions              Natural language             T3N identity
 Categories                 Decisions                    Consent
 Cashflow                   Goals                        Permissions
 Recurring spend            Simulations                  Audit
 Forecasts                  Risk                         Policy
       │                          │                          │
       └───────────────┬──────────┴───────────┬──────────────┘
                       ▼                      ▼
                DERIVED ATTRIBUTES       PROTECTED ACTIONS
                       │                      │
                       └──────── T3N ────────┘
                         identity / policy /
                       future TEE workflows
```

## Privacy model

### Current alpha

- CSV is selected and parsed in the browser.
- Parsed transactions are sent to the local server to calculate a financial model.
- The demo server does not write uploaded statements to persistent storage.
- Browser local storage can retain the parsed demo model for convenience; users should clear it before using sensitive data.
- T3N API credentials stay server-side.

### Production direction

A real release should move the private model into authenticated, encrypted storage and/or a protected computation environment, with explicit consent scopes, deletion/export controls, data minimization, key management and security review.

## Intelligence roadmap

### Layer 1 — Financial understanding
- CSV / bank-statement ingestion
- Transaction normalization
- Merchant/category classification
- Income and expense detection
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
- Cashflow forecasting
- “What changed?” explanations
- “What should I do next?” planning
- Confidence and evidence display

### Layer 3 — Continuous Guardian
- New-transaction monitoring
- Unusual-spend alerts
- Subscription creep detection
- Budget-boundary alerts
- Emergency-buffer protection
- Goal drift detection
- Upcoming-bill awareness
- Monthly financial reviews

### Layer 4 — Security Guardian
- Verifiable agent identity
- Capability-scoped permissions
- User consent receipts
- Policy engine
- Human approval gates
- Protected secrets
- Tamper-evident audit records
- Agent-to-agent trust

### Layer 5 — Autonomous money workflows
- Prepare bills for approval
- Prepare savings transfers
- Subscription cancellation workflows
- Payment-intent preparation
- Renewal reminders
- Negotiation/recommendation workflows
- Multi-step financial tasks with explicit approval checkpoints

**Important:** the current `/api/action` is intentionally a permission gate/demo. It does not execute real payments. Production execution requires provider integration, strong authentication, transaction signing, policy enforcement, risk controls and independent security/compliance review.

## T3N integration

The server uses the Terminal 3 T3N SDK for testnet agent authentication. When configured, it performs a handshake, authenticates the agent and receives a `did:t3n` identity. The expected DID can be checked through `T3N_DID`.

The repository does **not** claim that every current computation is already TEE-protected. Deeper TEE-backed private data maps, protected policy execution and production audit workflows remain part of the next security layer.

## Example user journey

```text
User uploads August statement
          ↓
Guardian builds financial model
          ↓
Health: 81/100 · Net: RM3,420 · Top spend: food
          ↓
User: “Can I afford a RM3,500 Japan trip?”
          ↓
Guardian checks cashflow + reserve + goals
          ↓
CAUTION: possible, but emergency reserve would fall below target
          ↓
User: “What should I change?”
          ↓
Guardian identifies food + shopping pressure
          ↓
User approves a savings goal
          ↓
Agent prepares an action intent
          ↓
T3N identity + permission + user consent + policy gate
          ↓
Human approval required before sensitive execution
```

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
