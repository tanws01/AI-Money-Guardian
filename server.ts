import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

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
  const reasons: string[] = [];

  if (purchaseAmount <= limit) {
    reasons.push(`Purchase is within the disclosed safe-spend limit of RM${limit.toLocaleString()}.`);
  } else {
    reasons.push(`Purchase exceeds the disclosed safe-spend limit of RM${limit.toLocaleString()}.`);
  }

  if (ratio >= 0.6) {
    reasons.push("Commitment ratio is high, so the guardian applies a stricter affordability rule.");
  } else {
    reasons.push("Commitment ratio is within the demo policy range.");
  }

  const approved = purchaseAmount <= limit && ratio < 0.6;
  return {
    decision: approved ? "APPROVED" : "DENIED",
    purchaseName,
    amount: purchaseAmount,
    reasons,
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
      mode: "demo",
      message: "T3N_API_KEY not configured. Decision engine is running in local demo mode.",
    };
  }

  try {
    const sdk = await import("@terminal3/t3n-sdk");
    sdk.setEnvironment("testnet");
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

    return {
      connected: true,
      mode: "live",
      did: did.value,
      network: "testnet",
      wallet: address,
      message: "Agent identity authenticated by T3N.",
    };
  } catch (error) {
    return {
      connected: false,
      mode: "error",
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
    res.end(JSON.stringify({ ok: true, app: "AI Money Guardian" }));
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
        purchaseName: String(input.purchaseName ?? "Purchase"),
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
