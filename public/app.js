const $ = (id) => document.getElementById(id);
const state = { profile: { incomeBand: "RM5k–RM7k", monthlyIncome: 6500, monthlyCommitments: 2500, savings: 15000, emergencyFundTarget: 7500, safeSpendLimit: 1200 }, category: "shopping" };
const money = (v) => Number(v || 0).toLocaleString("en-MY");

function setPurchase(name, amount, category = "shopping", icon = "✦") {
  $("purchaseName").value = name; $("purchaseAmount").value = amount; state.category = category;
  $("purchaseIcon").textContent = icon;
}

function setIdentity(data) {
  $("identityText").textContent = data?.connected ? "T3N · verified" : data?.mode === "demo" ? "T3N · demo" : "T3N · offline";
  if (data?.did) $("securityDid").textContent = data.did;
}
async function checkIdentity() { try { const r = await fetch("/api/t3/identity"); const d = await r.json(); setIdentity(d); return d; } catch { setIdentity({ mode: "offline" }); return {}; } }

function switchTab(id) {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active-view", v.id === id));
  $(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => setPurchase(b.dataset.name, Number(b.dataset.amount), b.dataset.category)));
$("purchaseAmount").addEventListener("input", () => {});

function renderChecks(checks) {
  const host = $("checks"); host.replaceChildren(); let passed = 0;
  checks.forEach((c) => { if (c.passed) passed++; const row = document.createElement("div"); row.className = "check-row"; row.innerHTML = `<span class="check-dot ${c.passed ? "pass" : "fail"}">${c.passed ? "✓" : "×"}</span><div><b>${c.label}</b><small>${c.detail}</small></div><strong class="${c.passed ? "pass" : "fail"}">${c.passed ? "PASSED" : "FAILED"}</strong>`; host.append(row); });
  $("ruleCount").textContent = `${passed} / ${checks.length} passed`;
}
function renderResult(data) {
  const approved = data.decision === "APPROVED", caution = data.decision === "CAUTION";
  $("result").classList.remove("hidden"); $("result").classList.toggle("approved", approved); $("result").classList.toggle("caution", caution);
  $("decisionTitle").textContent = approved ? "You can buy this." : caution ? "Proceed with caution." : "Keep your wallet closed.";
  $("decisionSummary").textContent = data.summary;
  $("decisionBadge").textContent = data.decision; $("decisionBadge").className = `badge ${approved ? "approved" : caution ? "caution" : "denied"}`;
  renderChecks(data.checks);
  $("insightList").replaceChildren(...data.insights.map((x) => { const p = document.createElement("p"); p.textContent = "→ " + x; return p; }));
  $("auditId").textContent = data.audit.id; $("agentId").textContent = data.audit.agentIdentity; $("network").textContent = data.audit.t3n?.network?.toUpperCase() ?? "DEMO";
  $("auditTime").textContent = new Date(data.audit.timestamp).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  setIdentity(data.audit.t3n); $("result").scrollIntoView({ behavior: "smooth", block: "center" });
}

$("decide").addEventListener("click", async () => {
  const amount = Number($("purchaseAmount").value); if (!Number.isFinite(amount) || amount <= 0) return;
  $("decide").disabled = true; $("checking").classList.remove("hidden"); $("result").classList.add("hidden");
  try {
    const r = await fetch("/api/decide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purchaseName: $("purchaseName").value || "Purchase", purchaseAmount: amount, category: state.category, profile: state.profile }) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Decision failed");
    await new Promise((x) => setTimeout(x, 500)); $("checking").classList.add("hidden"); renderResult(data);
  } catch (e) { $("checking").classList.add("hidden"); alert(e.message); } finally { $("decide").disabled = false; }
});

$("scanScam").addEventListener("click", () => {
  const text = $("scamText").value.toLowerCase();
  const signals = ["pay", "processing fee", "won", "claim", "urgent", "password", "otp", "transfer"].filter((x) => text.includes(x));
  const risk = Math.min(99, 35 + signals.length * 9);
  const box = $("scamResult"); box.classList.remove("hidden"); box.innerHTML = `<strong>🚨 HIGH RISK · ${risk}/100</strong><span>${signals.length} social-engineering signals detected: ${signals.join(", ") || "none"}.</span><b>Guardian recommendation: do not send money or credentials until independently verified.</b>`;
});

document.querySelector(".danger-demo")?.addEventListener("click", () => alert("BLOCKED — this agent does not have payment-execution permission. User authorization and policy approval are required."));
checkIdentity();
