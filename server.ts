import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const T3N_ENV = process.env.T3N_ENV ?? "testnet";
const EXPECTED_T3N_DID = process.env.T3N_DID;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

type DecisionInput = {
  purchaseAmount: number;
  purchaseName: string;
  category?: string;
  disclosed: {
    incomeBand: string;
    commitmentRatio: number;
    safeSpendLimit: number;
  };
};

function evaluate(input: DecisionInput) {
  const { purchaseAmount, purchaseName, disclosed } = input;
  const limit = Number(disclosed.safeSpendLimit);
  const ratio = Number(disclosed.commitmentRatio);
  const withinLimit = purchaseAmount <= limit;
  const healthyCommitments = ratio < 0.6;
  const approved = withinLimit && healthyCommitments;

  return {
    decision: approved ? "APPROVED" : "DENIED",
    purchaseName,
    amount: purchaseAmount,
    checks: [
      {
        label: "Safe-spend limit",
        detail: `RM${purchaseAmount.toLocaleString()} ${withinLimit ? "≤" : ">"} RM${limit.toLocaleString()}`,
        passed: withinLimit,
      },
      {
        label: "Commitment ratio",
        detail: `${Math.round(ratio * 100)}% < 60%`,
        passed: healthyCommitments,
      },
    ],
    reasons: approved
      ? [
          `RM${purchaseAmount.toLocaleString()} is within your disclosed RM${limit.toLocaleString()} safe-spend limit.`,
          `Your disclosed commitment ratio of ${Math.round(ratio * 100)}% is within the demo policy range.`,
        ]
      : [
          withinLimit
            ? `Purchase is within the disclosed RM${limit.toLocaleString()} safe-spend limit.`
            : `Purchase exceeds the disclosed RM${limit.toLocaleString()} safe-spend limit.`,
          healthyCommitments
            ? `Commitment ratio of ${Math.round(ratio * 100)}% is within the demo policy range.`
            : `Commitment ratio of ${Math.round(ratio * 100)}% is too high for this policy.`,
        ],
    policy: {
      rule: "purchaseAmount <= safeSpendLimit AND commitmentRatio < 60%",
      safeSpendLimit: limit,
      commitmentRatio: ratio,
    },
  };
}

async function t3Identity() {
  if (!process.env.T3N_API_KEY) {
    return {
      connected: false,
      authenticated: false,
      mode: "demo",
      network: T3N_ENV,
      message: "T3N_API_KEY not configured. Running in local demo mode.",
    };
  }

  try {
    const sdk = await import("@terminal3/t3n-sdk");
    sdk.setEnvironment(T3N_ENV as any);
    const wasmComponent = await sdk.loadWasmComponent();
    const address = sdk.eth_get_address(process.env.T3N_API_KEY);
    const t3n = new sdk.T3nClient({
      wasmComponent,
      handlers: {
        EthSign: sdk.metamask_sign(address, undefined, process.env.T3N_API_KEY),
      },
    });

    await t3n.handshake();
    const did = await t3n.authenticate(sdk.createEthAuthInput(address));
    const authenticatedDid = did.value;
    const didMatches = !EXPECTED_T3N_DID || authenticatedDid === EXPECTED_T3N_DID;

    return {
      connected: didMatches,
      authenticated: true,
      didMatches,
      mode: didMatches ? "live" : "identity-mismatch",
      did: authenticatedDid,
      network: T3N_ENV,
      wallet: address,
      message: didMatches
        ? "Agent identity authenticated by T3N."
        : "Authentication succeeded, but the returned DID does not match T3N_DID.",
    };
  } catch (error) {
    return {
      connected: false,
      authenticated: false,
      mode: "error",
      network: T3N_ENV,
      message: error instanceof Error ? error.message : "T3N authentication failed.",
    };
  }
}

async function body(request: Request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

async function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, app: "AI Money Guardian", t3nEnvironment: T3N_ENV }));
    return;
  }

  if (url.pathname === "/api/t3/identity") {
    const result = await t3Identity();
    res.writeHead(result.connected ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === "/api/decide" && req.method === "POST") {
    try {
      const input = await body(req);
      const purchaseAmount = Number(input.purchaseAmount);
      const disclosed = input.disclosed ?? {};

      if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
        throw new Error("Purchase amount must be a positive number.");
      }

      const result = evaluate({
        purchaseAmount,
        purchaseName: String(input.purchaseName ?? "Purchase").slice(0, 80),
        category: String(input.category ?? "other"),
        disclosed: {
          incomeBand: String(disclosed.incomeBand ?? "RM4k–RM6k"),
          commitmentRatio: Number(disclosed.commitmentRatio ?? 0.4),
          safeSpendLimit: Number(disclosed.safeSpendLimit ?? 1200),
        },
      });

      const identity = await t3Identity();
      const auditId = `AMG-${Date.now().toString(36).toUpperCase()}`;

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ...result,
        audit: {
          id: auditId,
          timestamp: new Date().toISOString(),
          agentIdentity: identity.did ?? "demo-agent",
          t3n: identity,
        },
        privacy: {
          disclosed: ["incomeBand", "commitmentRatio", "safeSpendLimit"],
          withheld: ["exactSalary", "bankAccount", "identityNumber", "transactionHistory"],
        },
      }));
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request." }));
    }
    return;
  }

  const relative = url.pathname === "/" ? "public/index.html" : join("public", url.pathname);
  const safePath = join(ROOT, relative);
  if (!safePath.startsWith(join(ROOT, "public"))) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  try {
    const file = await readFile(safePath);
    res.writeHead(200, { "content-type": MIME[extname(safePath)] ?? "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

createServer(handler).listen(PORT, () => {
  console.log(`AI Money Guardian running at http://localhost:${PORT}`);
});
