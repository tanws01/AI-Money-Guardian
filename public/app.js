const $ = (id) => document.getElementById(id);

const disclosed = { incomeBand: "RM4k–RM6k", commitmentRatio: 0.40, safeSpendLimit: 1200 };

function money(value) { return Number(value).toLocaleString("en-MY"); }

function setPurchase(name, amount, icon = "✦") {
  $("purchaseName").value = name;
  $("purchaseAmount").value = amount;
  $("previewName").textContent = name;
  $("previewAmount").textContent = money(amount);
  $("purchaseIcon").textContent = icon;
}

function setIdentityUI(data) {
  $("identityText").textContent = data?.connected ? "T3N · verified" : data?.mode === "demo" ? "T3N · demo" : "T3N · offline";
}

async function checkIdentity() {
  try {
    const response = await fetch("/api/t3/identity");
    const data = await response.json();
    setIdentityUI(data);
    return data;
  } catch {
    setIdentityUI({ mode: "offline" });
    return { connected: false, mode: "offline" };
  }
}

for (const button of document.querySelectorAll(".examples button, .suggestions button")) {
  button.addEventListener("click", () => {
    if (button.parentElement?.classList.contains("examples")) {
      document.querySelectorAll(".examples button").forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
    }
    setPurchase(button.dataset.name, Number(button.dataset.amount), button.dataset.icon ?? "✦");
  });
}

$("purchaseName").addEventListener("input", () => { $("previewName").textContent = $("purchaseName").value || "Purchase"; });
$("purchaseAmount").addEventListener("input", () => { $("previewAmount").textContent = money($("purchaseAmount").value || 0); });

function renderChecks(checks) {
  const host = $("checks");
  host.replaceChildren();
  let passed = 0;
  checks.forEach((check) => {
    if (check.passed) passed += 1;
    const row = document.createElement("div");
    row.className = "check-row";
    const icon = document.createElement("span");
    icon.className = `check-icon ${check.passed ? "pass" : "fail"}`;
    icon.textContent = check.passed ? "✓" : "×";
    const copy = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = check.label;
    const detail = document.createElement("small");
    detail.textContent = check.detail;
    copy.append(label, detail);
    const result = document.createElement("span");
    result.className = `check-result ${check.passed ? "pass" : "fail"}`;
    result.textContent = check.passed ? "PASSED" : "FAILED";
    row.append(icon, copy, result);
    host.append(row);
  });
  $("ruleCount").textContent = `${passed} / ${checks.length} rules passed`;
}

function renderResult(data) {
  const approved = data.decision === "APPROVED";
  const result = $("result");
  result.classList.remove("hidden", "approved");
  if (approved) result.classList.add("approved");

  $("decisionIcon").textContent = approved ? "✓" : "×";
  $("decisionBadge").textContent = data.decision;
  $("decisionBadge").className = `decision-badge ${approved ? "approved" : "denied"}`;
  $("decisionTitle").textContent = approved ? "You can buy this." : "Keep your wallet closed.";
  $("decisionSummary").textContent = `RM${money(data.amount)} · ${data.purchaseName}`;
  $("guardianMessage").textContent = approved ? "Looks safe. Your wallet can breathe. 😎" : "Nice try. Your wallet said no. 😌";
  renderChecks(data.checks);
  $("auditId").textContent = data.audit.id;
  $("agentId").textContent = data.audit.agentIdentity;
  $("network").textContent = data.audit.t3n?.network?.toUpperCase() ?? "DEMO MODE";
  $("auditTime").textContent = new Date(data.audit.timestamp).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  result.scrollIntoView({ behavior: "smooth", block: "center" });
}

$("decide").addEventListener("click", async () => {
  const button = $("decide");
  const checking = $("checking");
  const result = $("result");
  const amount = Number($("purchaseAmount").value);
  if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid purchase amount.");

  button.disabled = true;
  result.classList.add("hidden");
  checking.classList.remove("hidden");

  try {
    const response = await fetch("/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purchaseName: $("purchaseName").value || "Purchase", purchaseAmount: amount, disclosed }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Decision failed");

    $("checkingTitle").textContent = "Guardian verified the request.";
    $("checkingText").textContent = "Policy evaluated. Preparing your decision and audit proof.";
    await new Promise((resolve) => setTimeout(resolve, 450));
    checking.classList.add("hidden");
    renderResult(data);
    setIdentityUI(data.audit.t3n);
  } catch (error) {
    checking.classList.add("hidden");
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

$("identityButton").addEventListener("click", checkIdentity);
checkIdentity();
