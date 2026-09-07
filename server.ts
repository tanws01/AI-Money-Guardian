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
const MAX_BODY = 1_500_000;

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

type Transaction = { date: string; description: string; amount: number; type: "income" | "expense"; category?: string };
type Profile = { incomeBand: string; monthlyIncome: number; monthlyCommitments: number; savings: number; emergencyFundTarget: number; safeSpendLimit: number };

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function categoryFor(description: string) {
  const d = description.toLowerCase();
  if (/salary|payroll|pay\s?roll|income/.test(d)) return "income";
  if (/rent|mortgage|loan|car|insurance/.test(d)) return "housing & debt";
  if (/grocery|supermarket|aeon|lotus|tesco/.test(d)) return "groceries";
  if (/grab|foodpanda|restaurant|cafe|mcd|starbucks/.test(d)) return "food";
  if (/netflix|spotify|subscription|icloud/.test(d)) return "subscriptions";
  if (/shopee|lazada|apple|shopping|uniqlo/.test(d)) return "shopping";
  if (/petrol|shell|petron|fuel|parking|toll/.test(d)) return "transport";
  return "other";
}

function buildFinancialModel(transactions: Transaction[], openingBalance = 0) {
  const normalized = transactions.map((t) => ({ ...t, amount: Math.abs(Number(t.amount)), category: t.category || categoryFor(t.description) })).filter((t) => Number.isFinite(t.amount));
  const income = normalized.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = normalized.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCategory = Object.entries(normalized.filter(t => t.type === "expense").reduce<Record<string, number>>((a, t) => { a[t.category!] = (a[t.category!] || 0) + t.amount; return a; }, {})).sort((a,b) => b[1]-a[1]);
  const recurring = byCategory.filter(([c]) => ["housing & debt", "subscriptions", "transport"].includes(c)).reduce((s, [,v]) => s+v, 0);
  const net = income - expenses;
  const savingsRate = income ? net / income : 0;
  const health = clamp(Math.round(55 + savingsRate * 80 - (recurring / Math.max(income,1)) * 25), 0, 100);
  const months = expenses > 0 && openingBalance > 0 ? openingBalance / expenses : null;
  return { transactionCount: normalized.length, income, expenses, net, savingsRate, health, runwayMonths: months, topCategories: byCategory.slice(0, 6), recurringEstimate: recurring, transactions: normalized };
}

function assessPurchase(amount: number, name: string, category: string, profile: Profile) {
  const income = Math.max(0, profile.monthlyIncome), commitments = Math.max(0, profile.monthlyCommitments), savings = Math.max(0, profile.savings), limit = Math.max(0, profile.safeSpendLimit);
  const ratio = income ? commitments / income : 1;
  const discretionary = Math.max(0, income - commitments);
  const bufferProtected = savings - amount >= Math.max(0, profile.emergencyFundTarget);
  const highRisk = ["debt", "transfer", "investment"].includes(category);
  const checks = [
    { label: "Safe-spend limit", detail: `RM${amount.toLocaleString()} ${amount <= limit ? "≤" : ">"} RM${limit.toLocaleString()}`, passed: amount <= limit },
    { label: "Commitment ratio", detail: `${Math.round(ratio * 100)}% ${ratio < .6 ? "<" : "≥"} 60%`, passed: ratio < .6 },
    { label: "Emergency buffer", detail: bufferProtected ? "Protected after purchase" : "Would dip below target", passed: bufferProtected },
    { label: "Purchase risk", detail: highRisk ? "High-risk category requires extra review" : "Standard discretionary purchase", passed: !highRisk },
  ];
  const failed = checks.filter(c => !c.passed);
  const decision = failed.length === 0 ? "APPROVED" : failed.length >= 2 ? "DENIED" : "CAUTION";
  return { decision, purchaseName: name, amount, category, summary: decision === "APPROVED" ? `RM${amount.toLocaleString()} fits inside your current safety boundaries.` : decision === "CAUTION" ? "One safety boundary needs attention before you proceed." : `${failed.length} safety boundaries would be breached by this purchase.`, checks, insights: [`Monthly discretionary capacity: RM${discretionary.toLocaleString()}.`, `Commitment ratio: ${Math.round(ratio*100)}%.`, bufferProtected ? "Emergency target remains protected." : "This purchase would reduce your protected reserve.", amount > limit ? `RM${(amount-limit).toLocaleString()} above your safe-spend limit.` : "Inside your configured spending boundary."], policy: { safeSpendLimit: limit, commitmentRatio: ratio, emergencyFundTarget: profile.emergencyFundTarget } };
}

function answerQuestion(question: string, model: ReturnType<typeof buildFinancialModel>, profile: Profile) {
  const q = question.toLowerCase();
  const avgMonthly = model.expenses;
  if (/where|spend|spending|category|expense/.test(q)) {
    const top = model.topCategories.slice(0,3).map(([c,v]) => `${c}: RM${Math.round(v).toLocaleString()}`).join(" · ");
    return { answer: `Your biggest spending areas are ${top || "not enough data yet"}.`, confidence: model.transactionCount ? 0.92 : 0.35, evidence: ["categorized transaction history", "period spending totals"] };
  }
  if (/save|saving|savings|emergency/.test(q)) {
    return { answer: `Your modeled monthly net is RM${Math.round(model.net).toLocaleString()}. At that pace, an emergency target of RM${profile.emergencyFundTarget.toLocaleString()} is ${model.net >= 0 ? "achievable if you keep the current surplus" : "not yet supported by current cashflow"}.`, confidence: 0.88, evidence: ["income vs expense model", "configured emergency target"] };
  }
  if (/afford|buy|purchase|iphone|car|holiday|trip/.test(q)) {
    const m = q.match(/rm\s?([\d,]+)/i);
    const amount = m ? Number(m[1].replace(/,/g,"")) : profile.safeSpendLimit;
    const result = assessPurchase(amount, "Questioned purchase", "shopping", profile);
    return { answer: result.summary, confidence: 0.86, evidence: result.checks.map(c => c.label) };
  }
  if (/health|okay|good|financially/.test(q)) {
    return { answer: `Your current modeled financial health is ${model.health}/100. ${model.savingsRate >= .2 ? "Your surplus is healthy." : "The main opportunity is increasing your monthly surplus."}`, confidence: 0.9, evidence: ["savings rate", "expense pressure", "cashflow"] };
  }
  return { answer: `I can analyze your cashflow, spending categories, savings capacity, affordability and financial health. Your current modeled net is RM${Math.round(model.net).toLocaleString()}.`, confidence: 0.72, evidence: ["current financial model"] };
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
  } catch (error) { return { connected: false, authenticated: false, mode: "error", network: T3N_ENV, message: error instanceof Error ? error.message : "T3N authentication failed." }; }
}

async function parseBody(req: any) {
  const text = await new Promise<string>((resolve, reject) => { let data = ""; req.on("data", (chunk: Buffer) => { data += chunk.toString(); if (data.length > MAX_BODY) reject(new Error("Request too large.")); }); req.on("end", () => resolve(data)); req.on("error", reject); });
  return text ? JSON.parse(text) : {};
}
function send(res: any, status: number, payload: unknown) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(payload)); }

async function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/health") return send(res, 200, { ok: true, app: "AI Money Guardian", version: "0.3.0", t3nEnvironment: T3N_ENV, intelligence: true });
  if (url.pathname === "/api/t3/identity") return send(res, 200, await t3Identity());

  if (url.pathname === "/api/model" && req.method === "POST") {
    try { const input = await parseBody(req); const transactions: Transaction[] = Array.isArray(input.transactions) ? input.transactions.slice(0, 5000).map((t:any) => ({ date: String(t.date||""), description: String(t.description||"Unknown").slice(0,120), amount: Number(t.amount), type: t.type === "income" ? "income" : "expense", category: t.category ? String(t.category).slice(0,40) : undefined })) : []; const model = buildFinancialModel(transactions, Number(input.openingBalance||0)); return send(res,200,{ model, privacy: { rawTransactionsProcessed: true, persistentStorage: false, disclosure: "Derived financial metrics can be shared without exposing raw records." } }); } catch(e) { return send(res,400,{error:e instanceof Error?e.message:"Invalid model request."}); }
  }
  if (url.pathname === "/api/ask" && req.method === "POST") {
    try { const input=await parseBody(req); const transactions: Transaction[] = Array.isArray(input.transactions) ? input.transactions.slice(0,5000) : []; const profile: Profile = input.profile ?? { incomeBand:"Unknown", monthlyIncome:6500, monthlyCommitments:2500, savings:15000, emergencyFundTarget:7500, safeSpendLimit:1200 }; const model=buildFinancialModel(transactions,Number(input.openingBalance||profile.savings||0)); const result=answerQuestion(String(input.question||""),model,profile); return send(res,200,{...result, modelSummary:{health:model.health, income:model.income, expenses:model.expenses, net:model.net, transactionCount:model.transactionCount}, privacy:{usedDerivedModel:true, rawRecordsRequired:true, rawRecordsStored:false}}); } catch(e) { return send(res,400,{error:e instanceof Error?e.message:"Unable to answer."}); }
  }
  if (url.pathname === "/api/action" && req.method === "POST") {
    try { const input=await parseBody(req); const action=String(input.action||""); const amount=Number(input.amount||0); const identity=await t3Identity(); const sensitive=["transfer","payment","withdrawal"].includes(action); const allowed=identity.connected && !sensitive; const auditId=`AMG-${Date.now().toString(36).toUpperCase()}`; return send(res,allowed?200:403,{ allowed, action, amount, reason: allowed ? "Agent identity verified and action is within demo permission scope." : sensitive ? "Blocked: payment execution requires explicit user authorization and a production policy/TEE workflow." : "Blocked: T3N identity is not verified.", audit:{id:auditId,timestamp:new Date().toISOString(),agentIdentity:identity.did??"demo-agent",t3n:identity}, nextStep: sensitive ? "Create a human-approved payment intent; do not auto-execute." : "Review policy and consent." }); } catch(e) { return send(res,400,{error:e instanceof Error?e.message:"Invalid action."}); }
  }
  if (url.pathname === "/api/decide" && req.method === "POST") {
    try { const input=await parseBody(req); const purchaseAmount=Number(input.purchaseAmount); if(!Number.isFinite(purchaseAmount)||purchaseAmount<=0||purchaseAmount>1_000_000) throw new Error("Purchase amount must be between RM1 and RM1,000,000."); const raw=input.profile??{}; const profile:Profile={incomeBand:String(raw.incomeBand??"RM5k–RM7k").slice(0,30),monthlyIncome:Number(raw.monthlyIncome??6500),monthlyCommitments:Number(raw.monthlyCommitments??2500),savings:Number(raw.savings??15000),emergencyFundTarget:Number(raw.emergencyFundTarget??7500),safeSpendLimit:Number(raw.safeSpendLimit??1200)}; if(![profile.monthlyIncome,profile.monthlyCommitments,profile.savings,profile.emergencyFundTarget,profile.safeSpendLimit].every(Number.isFinite)) throw new Error("Financial profile contains invalid numbers."); const result=assessPurchase(purchaseAmount,String(input.purchaseName??"Purchase").slice(0,80),String(input.category??"shopping").slice(0,30),profile); const identity=await t3Identity(); return send(res,200,{...result,audit:{id:`AMG-${Date.now().toString(36).toUpperCase()}`,timestamp:new Date().toISOString(),agentIdentity:identity.did??"demo-agent",t3n:identity},privacy:{disclosed:["incomeBand","commitmentRatio","safeSpendLimit"],withheld:["exactSalary","bankAccount","identityNumber","transactionHistory","merchantDetails"]}}); } catch(e) { return send(res,400,{error:e instanceof Error?e.message:"Invalid request."}); }
  }

  const requested=decodeURIComponent(url.pathname==="/"?"/index.html":url.pathname); const safePath=normalize(join(PUBLIC_ROOT,requested)); if(!safePath.startsWith(PUBLIC_ROOT)) return res.writeHead(403).end("Forbidden");
  try { const file=await readFile(safePath); res.writeHead(200,{"content-type":MIME[extname(safePath)]??"application/octet-stream"}); res.end(file); } catch { res.writeHead(404,{"content-type":"text/plain; charset=utf-8"}); res.end("Not found"); }
}
createServer(handler).listen(PORT,()=>console.log(`AI Money Guardian running at http://localhost:${PORT}`));
