import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_ROOT = join(ROOT, "public");
const PORT = Number(process.env.PORT ?? 3000);
const T3N_ENV = process.env.T3N_ENV ?? "testnet";
const EXPECTED_T3N_DID = process.env.T3N_DID?.trim();

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

type Profile = {
  incomeBand: string;
  monthlyIncome: number;
  monthlyCommitments: number;
  savings: number;
  emergencyFundTarget: number;
  safeSpendLimit: number;
};

type DecisionInput = {
  purchaseAmount: number;
  purchaseName: string;
  category: string;
  profile: Profile;
};

function assess(input: DecisionInput) {
  const { purchaseAmount, purchaseName, category, profile } = input;
  const income = Math.max(0, Number(profile.monthlyIncome));
  const commitments = Math.max(0, Number(profile.monthlyCommitments));
  const savings = Math.max(0, Number(profile.savings));
  const limit = Math.max(0, Number(profile.safeSpendLimit));
  const ratio = income > 0 ? commitments / income : 1;
  const discretionary = Math.max(0, income - commitments);
  const emergencyMonths = commitments > 0 ? savings / commitments : 99;
  const withinLimit = purchaseAmount <= limit;
  const healthyCommitments = ratio < 0.6;
  const bufferProtected = savings - purchaseAmount >= Math.max(0, Number(profile.emergencyFundTarget));
  const highRiskCategory = ["debt", "transfer", "investment"].includes(category);

  const checks = [
    { label: "Safe-spend limit", detail: `RM${purchaseAmount.toLocaleString()} ${withinLimit ? "≤" : ">"} RM${limit.toLocaleString()}`, passed: withinLimit },
    { label: "Commitment ratio", detail: `${Math.round(ratio * 100)}% ${healthyCommitments ? "<" : "≥"} 60%`, passed: healthyCommitments },
    { label: "Emergency buffer", detail: bufferProtected ? "Protected after purchase" : "Would dip below target", passed: bufferProtected },
    { label: "Purchase risk", detail: highRiskCategory ? "High-risk category requires extra review" : "Standard discretionary purchase", passed: !highRiskCategory },
  ];

  const approved = checks.every((check) => check.passed);
  const verdict = approved ? "APPROVED" : checks.filter((check) => !check.passed).length >= 2 ? "DENIED" : "CAUTION";
  const failed = checks.filter((check) => !check.passed);
  const summary = approved
    ? `RM${purchaseAmount.toLocaleString()} fits inside your current safety boundaries.`
    : verdict === "CAUTION"
      ? `You can technically afford RM${purchaseAmount.toLocaleString()}, but one safety boundary needs attention.`
      : `${failed.length} safety boundaries would be breached by this purchase.`;

  return {
    decision: verdict,
    purchaseName,
    amount: purchaseAmount,
    category,
    summary,
    checks,
    insights: [
      `Monthly discretionary capacity: RM${discretionary.toLocaleString()}.`,
      `Current emergency runway: ${emergencyMonths === 99 ? "strong" : emergencyMonths.toFixed(1) + " months"}.`,
      withinLimit ? "Purchase is inside your configured spending boundary." : `Purchase is RM${(purchaseAmount - limit).toLocaleString()} above your safe-spend limit.`,
    ],
    policy: { safeSpendLimit: limit, commitmentRatio: ratio, emergencyFundTarget: profile.emergencyFundTarget },
  };
}

async function t3Identity() {
  if (!process.env.T3N_API_KEY) return { connected: false, authenticated: false, mode: "demo", network: T3N_ENV, message: "T3N_API_KEY not configured. Running in local demo mode." };
  try {
    const sdk = await import("@terminal3/t3n-sdk");
    sdk.setEnvironment(T3N_ENV as any);
    const wasmComponent = await sdk.loadWasmComponent();
    const address = sdk.eth_get_address(process.env.T3N_API_KEY);
    const t3n = new sdk.T3nClient({ wasmComponent, handlers: { EthSign: sdk.metamask_sign(address, undefined, process.env.T3N_API_KEY) } });
    await t3n.handshake();
    const did = await t3n.authenticate(sdk.createEthAuthInput(address));
    const didMatches = !EXPECTED_T3N_DID || did.value === EXPECTED_T3N_DID;
    return { connected: didMatches, authenticated: true, didMatches, mode: didMatches ? "live" : "identity-mismatch", did: did.value, network: T3N_ENV, wallet: address, message: didMatches ? "Agent identity authenticated by T3N." : "Authenticated DID does not match T3N_DID." };
  } catch (error) {
    return { connected: false, authenticated: false, mode: "error", network: T3N_ENV, message: error instanceof Error ? error.message : "T3N authentication failed." };
  }
}

async function parseBody(req: any) {
  const text = await new Promise<string>((resolve, reject) => { let data = ""; req.on("data", (chunk: Buffer) => { data += chunk.toString(); if (data.length > 200_000) reject(new Error("Request too large.")); }); req.on("end", () => resolve(data)); req.on("error", reject); });
  return text ? JSON.parse(text) : {};
}

function send(res: any, status: number, payload: unknown) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(payload)); }

async function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/health") return send(res, 200, { ok: true, app: "AI Money Guardian", t3nEnvironment: T3N_ENV });
  if (url.pathname === "/api/t3/identity") { const identity = await t3Identity(); return send(res, identity.connected ? 200 : 503, identity); }

  if (url.pathname === "/api/decide" && req.method === "POST") {
    try {
      const input = await parseBody(req);
      const purchaseAmount = Number(input.purchaseAmount);
      if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0 || purchaseAmount > 1_000_000) throw new Error("Purchase amount must be between RM1 and RM1,000,000.");
      const raw = input.profile ?? {};
      const profile: Profile = {
        incomeBand: String(raw.incomeBand ?? "RM5k–RM7k").slice(0, 30),
        monthlyIncome: Number(raw.monthlyIncome ?? 6500),
        monthlyCommitments: Number(raw.monthlyCommitments ?? 2500),
        savings: Number(raw.savings ?? 15000),
        emergencyFundTarget: Number(raw.emergencyFundTarget ?? 7500),
        safeSpendLimit: Number(raw.safeSpendLimit ?? 1200),
      };
      if (![profile.monthlyIncome, profile.monthlyCommitments, profile.savings, profile.emergencyFundTarget, profile.safeSpendLimit].every(Number.isFinite)) throw new Error("Financial profile contains invalid numbers.");
      const result = assess({ purchaseAmount, purchaseName: String(input.purchaseName ?? "Purchase").slice(0, 80), category: String(input.category ?? "shopping").slice(0, 30), profile });
      const identity = await t3Identity();
      const auditId = `AMG-${Date.now().toString(36).toUpperCase()}`;
      return send(res, 200, {
        ...result,
        audit: { id: auditId, timestamp: new Date().toISOString(), agentIdentity: identity.did ?? "demo-agent", t3n: identity },
        privacy: { disclosed: ["incomeBand", "commitmentRatio", "safeSpendLimit"], withheld: ["exactSalary", "bankAccount", "identityNumber", "transactionHistory", "merchantDetails"] },
      });
    } catch (error) { return send(res, 400, { error: error instanceof Error ? error.message : "Invalid request." }); }
  }

  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = normalize(join(PUBLIC_ROOT, requested));
  if (!safePath.startsWith(PUBLIC_ROOT)) return res.writeHead(403).end("Forbidden");
  try { const file = await readFile(safePath); res.writeHead(200, { "content-type": MIME[extname(safePath)] ?? "application/octet-stream" }); res.end(file); }
  catch { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Not found"); }
}

createServer(handler).listen(PORT, () => console.log(`AI Money Guardian running at http://localhost:${PORT}`));
