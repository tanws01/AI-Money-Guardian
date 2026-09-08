# AI Money Guardian — Agent Instructions

## Project mission
Build and improve **AI Money Guardian**, a privacy-first financial operating system that helps users understand affordability, spending pressure, goals, scenarios, and protected financial actions.

The product thesis is:

> Your money. Your rules. Your AI.

Terminal 3 **T3N ADK is a core trust and execution layer**, not a decorative integration. When adding agent capabilities, look for opportunities to use verifiable identity, scoped authorization, TEE-protected execution, policy enforcement, secrets protection, and auditable actions.

## Repository boundaries
- This repository is independent. Do not move code into FAHAMI or depend on FAHAMI.
- Keep the public product name **AI Money Guardian**.
- Do not associate this project with the previous FAHAMI project.

## Security and privacy — non-negotiable
- Never commit API keys, private keys, wallet secrets, bank credentials, identity numbers, payment credentials, or real financial records.
- Never commit `.env` files or other local secret/config files.
- T3N credentials must remain server-side and must never be exposed to browser code.
- Treat any previously exposed credential as compromised and recommend rotation rather than reproducing it.
- Keep demo financial data synthetic.
- Prefer derived financial attributes over raw financial data when an agent only needs a decision signal.
- Do not send exact salary, bank account numbers, identity numbers, or full transaction history to an external agent when derived attributes are sufficient.

Preferred derived attributes include:
- `incomeBand`
- `commitmentRatio`
- `safeSpendLimit`
- cashflow pressure / reserve indicators
- goal progress and bounded affordability signals

## T3N principles
T3N should be used as real infrastructure whenever the capability requires trusted agent identity, authorization, protected computation, or sensitive action handling.

Current T3N architecture includes:
- `T3nClient` authentication and agent identity (`did:t3n`)
- T3N session / usage telemetry
- application-level policy preflight
- a WASM TEE policy contract under `t3n-contract/`
- deployment via `scripts/t3n-deploy-policy.ts`
- protected contract invocation via `scripts/t3n-protected-payment.ts`
- optional `T3N_CONTRACT_SCRIPT` configuration

### T3N implementation order
1. Establish a working `T3nClient` handshake.
2. Authenticate and verify the returned T3N DID.
3. Apply the app-level policy gate before sensitive actions.
4. For protected actions, prefer real T3N contract execution over local simulation.
5. Keep policy enforcement independent from LLM output where possible.
6. Resolve and verify the deployed contract/script version before invocation.
7. Only describe an action as protected, live, immutable, or executed when the implementation actually proves that state.

### Honesty boundary
Do **not** claim that:
- local financial calculations are automatically TEE-protected;
- a local audit ID is an immutable T3N ledger record;
- a payment was executed merely because a policy contract approved it;
- Agent Connect or Stripe execution is live unless the code actually reaches the configured test/protected flow;
- credentials or secrets are protected by T3N unless they actually pass through the relevant protected boundary.

Use explicit labels such as `demo`, `simulated`, `contract-ready`, or `protected` when those distinctions matter.

## Product architecture
Think in three layers:

1. **Private Money Model** — statement ingestion, categorization, cashflow, recurring spend, forecasts, goals, and derived financial attributes.
2. **Guardian Reasoning** — natural-language Q&A, affordability decisions, goals, life simulations, scam detection, and risk reasoning.
3. **T3N Trust Layer** — agent identity, authorization, policy enforcement, protected execution, secrets boundary, delegation/revocation, and audit evidence.

The Guardian should propose and reason; deterministic policy and protected infrastructure should enforce sensitive boundaries.

## Sensitive actions
For any future payment, transfer, withdrawal, or other high-impact action:
- require explicit user consent;
- enforce a bounded mandate such as maximum amount and allowed category/function;
- validate currency and relevant policy constraints;
- never expose raw credentials to the LLM or browser;
- prefer T3N protected execution where supported;
- preserve useful audit evidence;
- fail closed when identity, consent, policy, or protected execution requirements are missing.

## Code and architecture conventions
- TypeScript/JavaScript, ESM.
- Prefer small, explicit functions and clear data flow.
- Avoid unnecessary frameworks for this product unless they provide clear value.
- Keep browser code free of server-side secrets and T3N private credentials.
- Validate external/user input at API boundaries.
- Keep policy logic deterministic and testable.
- Reuse existing API routes and product modules before introducing parallel abstractions.
- Keep the UI fast, clear, and demo-friendly, but do not sacrifice security claims for visual polish.

## Local development
```bash
npm install
npm run dev
```

For T3N protected policy development:
```bash
npm run t3n:deploy
npm run t3n:pay
```

Required T3N configuration is supplied through the local environment only. Do not add an `.env.example` containing credentials or identity values to the public repository.

For the WASM policy contract, use the Rust/WASI build configuration documented by the contract files under `t3n-contract/`.

## Demo expectations
A good demo should make the trust boundary obvious:
1. Ask a natural-language affordability question.
2. Show the Guardian's financial reasoning.
3. Show the minimum derived data used for the decision.
4. Show T3N agent identity and session state.
5. Show policy preflight for a sensitive action.
6. For a protected action, show the actual T3N contract decision when configured.
7. Clearly distinguish approval from actual payment execution.

Example affordability checks:
- RM4,999 iPhone → normally DENIED under the demo spending mandate.
- RM500 headphones → normally APPROVED when the user's model and policy allow it.

## Documentation and agent behavior
- Keep README and agent instructions aligned with the implementation.
- Update documentation when a T3N capability becomes genuinely live.
- Do not invent SDK methods, T3N capabilities, contract receipts, or payment outcomes.
- When T3N behavior depends on a version-specific SDK surface, verify it against the installed SDK and current Terminal 3 documentation before implementing.
- Prefer official Terminal 3 documentation for T3N behavior; use community examples only as implementation references and verify them before relying on them.
- Before committing changes, inspect the relevant files and run the smallest meaningful validation available.
