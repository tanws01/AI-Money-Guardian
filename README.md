# AI Money Guardian 🛡️

> **Your money doesn't need another budgeting app. It needs a bouncer.**

AI Money Guardian is a privacy-first AI agent that answers a simple question: **“Can I afford this?”**

Instead of handing an AI your salary, bank account, and transaction history, the Guardian works with a small set of **selectively disclosed financial attributes** — such as an income band, commitment ratio, and safe-spend limit — and returns an auditable spending decision.

Built as a hackathon prototype with the **Terminal 3 Agent Developer Kit (T3N ADK)**.

## Why this matters

Most financial assistants assume more data = better advice. AI Money Guardian explores the opposite idea:

**Give the agent less data, but make the data useful and verifiable.**

A user can disclose:

- Income band: `RM4k–RM6k`
- Commitment ratio: `40%`
- Safe-spend limit: `RM1,200`

While keeping these hidden:

- Exact salary
- Bank account details
- Identity number
- Full transaction history

The agent can still make a simple policy decision.

## Demo

Try these examples:

| Purchase | Amount | Result |
|---|---:|---|
| iPhone 17 Pro | RM4,999 | 🔴 DENIED |
| Headphones | RM500 | 🟢 APPROVED |
| Dinner | RM80 | 🟢 APPROVED |

The demo policy is intentionally simple:

```text
purchaseAmount <= safeSpendLimit
AND
commitmentRatio < 60%
```

This is a product/security demonstration, **not financial advice**.

## T3N ADK integration

Terminal 3's ADK provides an authenticated agent session and a `did:t3n` identity. This project uses the T3N SDK server-side so the API key never reaches the browser.

The live path is:

```text
User
  │
  │ purchase request + selective financial attributes
  ▼
AI Money Guardian
  │
  ├── affordability policy
  │
  ├── T3nClient.handshake()
  │
  ├── T3nClient.authenticate()
  │        │
  │        └── did:t3n agent identity
  │
  └── audit event
```

Terminal 3 documents that the ADK authenticates an agent with an Ethereum wallet, opens an encrypted channel to the TEE node, and returns the tenant DID from the authenticated session. It also supports TEE contracts and `executeAndDecode()` for protected contract execution. See the official documentation for the current API surface.

## Current implementation

### Working now

- Privacy-first spending decision UI
- Selective-disclosure financial profile
- Deterministic affordability policy
- T3N testnet authentication when `T3N_API_KEY` is configured
- `did:t3n` identity displayed in the audit panel
- Timestamped demo audit event
- Responsive single-page interface

### Next T3N layer

The architecture intentionally leaves a clean boundary for a TEE-backed policy contract:

```text
Browser
  → server-side agent
  → T3N authenticated session
  → T3N TEE policy contract
  → APPROVED / DENIED
```

A future contract can enforce the affordability rule inside T3N so that even a compromised or prompt-injected AI layer cannot override the policy.

## Run locally

### Requirements

- Node.js 18+
- A Terminal 3 testnet API key for live T3N identity

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and add your T3N key:

```bash
T3N_API_KEY=your_testnet_key
```

If no key is configured, the app still runs in **demo mode** and clearly labels the T3N identity as a demo identity.

### Start

```bash
npm run dev
```

Open `http://localhost:3000`.

## Security notes

- Never commit `T3N_API_KEY`.
- The T3N key is read server-side only.
- The browser sends only derived financial attributes in this prototype.
- Do not use real bank-account or identity data in the hackathon demo.
- The affordability policy is illustrative and should not be presented as professional financial advice.

## Hackathon challenge mapping

| Challenge theme | AI Money Guardian |
|---|---|
| Verifiable agent identity | Live `did:t3n` authentication |
| Privacy-preserving workflows | Selective disclosure of affordability attributes |
| Secure agent actions | Spending decision behind a policy boundary |
| Auditable actions | Timestamped decision + agent identity |
| TEE / protected execution | Designed for a T3N policy contract in the next layer |

## 3-minute demo script

**0:00 — Hook**

> “Would you give an AI your salary and bank account just to ask if you can afford an iPhone?”

**0:15 — Explain**

Show the three shared attributes and the hidden fields.

> “The Guardian doesn't need my raw financial data. It only needs the attributes required to make this decision.”

**0:35 — Deny**

Enter `RM4,999` for an iPhone.

> “The Guardian denies it because RM4,999 is above my RM1,200 safe-spend limit.”

**1:15 — Privacy**

Point to the hidden exact salary, bank account, and transaction history.

> “Those never need to be disclosed to the decision layer.”

**1:35 — Approve**

Enter `RM500` for headphones.

> “Same financial profile. Different purchase. Approved.”

**2:00 — T3N identity**

Show the `did:t3n` identity and audit event.

> “The agent itself is authenticated by T3N, so this isn't just an anonymous script making the decision.”

**2:25 — Close**

> “AI Money Guardian is a bouncer for your wallet: it can say yes or no without needing to know everything about you.”

## References

- Terminal 3 Agent Developer Kit: https://terminal3.io/products/agent-developer-kit
- Terminal 3 ADK documentation: https://docs.terminal3.io/developers/adk/overview/what-is-adk
- Terminal 3 Quickstart: https://docs.terminal3.io/developers/adk/get-started/quickstart

## License

MIT
