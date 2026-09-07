# AI Money Guardian — Codex instructions

## Goal
Build and improve a privacy-first spending-decision agent using Terminal 3 T3N ADK.

## Non-negotiables
- This repository is independent. Do not move code into FAHAMI or depend on FAHAMI.
- Never commit API keys, private keys, bank details, identity numbers, or real financial records.
- Keep Terminal 3 credentials server-side only.
- Do not claim a T3N action is live unless the code actually reaches T3N.
- Keep demo financial data synthetic.

## Product principle
The agent should make a useful affordability decision while receiving only the minimum derived financial attributes needed for that decision.

Preferred disclosed attributes:
- incomeBand
- commitmentRatio
- safeSpendLimit

Do not send:
- exact salary
- bank account number
- identity number
- full transaction history

## T3N development order
1. Get a working `T3nClient` handshake.
2. Authenticate and capture the returned `tenantDid` / `did:t3n` value.
3. Only then add tenant data or TEE contract execution.
4. If a TEE policy contract is added, make the policy enforceable independently of the LLM output.

## Local commands
```bash
npm install
npm run dev
```

## Demo path
1. Open the web app.
2. Try RM4,999 iPhone → DENIED.
3. Show the selective-disclosure panel.
4. Try RM500 headphones → APPROVED.
5. Show the T3N identity and audit event.

## Code style
- TypeScript/JavaScript, ESM.
- Prefer small, explicit functions.
- Avoid unnecessary frameworks for the hackathon prototype.
- Keep the UI fast and demo-friendly.
