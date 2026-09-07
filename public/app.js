const $ = (id) => document.getElementById(id);

const disclosed = {
  incomeBand: "RM4k–RM6k",
  commitmentRatio: 0.40,
  safeSpendLimit: 1200,
};

for (const button of document.querySelectorAll(".examples button")) {
  button.addEventListener("click", () => {
    $("purchaseName").value = button.dataset.name;
    $("purchaseAmount").value = button.dataset.amount;
    document.querySelectorAll(".examples button").forEach((b) => b.classList.remove("selected"));
    button.classList.add("selected");
  });
}

$("decide").addEventListener("click", async () => {
  const button = $("decide");
  const result = $("result");
  button.disabled = true;
  button.innerHTML = "Guardian is checking…";

  try {
    const response = await fetch("/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purchaseName: $("purchaseName").value,
        purchaseAmount: Number($("purchaseAmount").value),
        disclosed,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Decision failed");

    result.classList.remove("hidden");
    const approved = data.decision === "APPROVED";
    $("decisionBadge").textContent = data.decision;
    $("decisionBadge").className = `decision-badge ${approved ? "approved" : "denied"}`;
    $("decisionTitle").textContent = approved ? "You can buy this." : "Keep your wallet closed.";
    $("decisionSummary").textContent = `RM${Number(data.amount).toLocaleString()} · ${data.purchaseName}`;
    $("reasons").innerHTML = data.reasons.map((reason) => `<div>• ${reason}</div>`).join("");
    $("auditId").textContent = data.audit.id;
    $("agentId").textContent = data.audit.agentIdentity;
    $("network").textContent = data.audit.t3n?.network?.toUpperCase() ?? "DEMO MODE";
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Ask the Guardian <span>→</span>';
  }
});
