(() => {
  const q = (id) => document.getElementById(id);
  const money = (v) => `RM${Math.round(Number(v || 0)).toLocaleString("en-MY")}`;

  function injectTrustLab() {
    const host = q("t3n-command");
    if (!host || q("t3n-trust-lab")) return;

    const card = document.createElement("article");
    card.id = "t3n-trust-lab";
    card.className = "card wide-card";
    card.innerHTML = `
      <div class="card-title"><span>T3N TRUST WORKFLOW</span><b id="labState">READY</b></div>
      <div class="model-grid">
        <div class="model-stat"><small>MANDATE</small><strong id="mandateState">NONE</strong></div>
        <div class="model-stat"><small>SPEND CAP</small><strong id="mandateCap">—</strong></div>
        <div class="model-stat"><small>HOST SCOPE</small><strong id="mandateHost">—</strong></div>
        <div class="model-stat"><small>REVOCATION</small><strong id="mandateRevoke">ACTIVE</strong></div>
      </div>
      <div class="action-grid" style="margin-top:16px">
        <div>
          <div class="action-item"><span>1 · Issue least-privilege mandate</span><button id="issueMandate" class="secondary">Issue</button></div>
          <div class="action-item"><span>2 · Prepare RM500 payment intent</span><button id="prepareIntent" class="secondary">Preflight</button></div>
          <div class="action-item"><span>3 · Attempt RM5,000 transfer</span><button id="overLimit" class="danger-demo">Test block</button></div>
          <div class="action-item"><span>4 · Revoke Guardian mandate</span><button id="revokeMandate" class="danger-demo">Revoke</button></div>
        </div>
        <div id="trustTimeline" class="bubble">
          <b>T3N workflow idle.</b><br><span class="tiny">Issue a scoped mandate, test policy enforcement, then revoke it.</span>
        </div>
      </div>`;

    host.querySelector(".intel-grid")?.appendChild(card);

    const timeline = (title, detail, good = true) => {
      const line = document.createElement("div");
      line.style.padding = "9px 0";
      line.style.borderBottom = "1px solid #24272b";
      line.innerHTML = `<b class="${good ? "success" : "danger"}">${good ? "✓" : "×"} ${title}</b><br><span class="tiny">${detail}</span>`;
      q("trustTimeline")?.prepend(line);
    };

    const setState = (state, cap = "—", host = "—", revoked = "ACTIVE") => {
      q("mandateState").textContent = state;
      q("mandateCap").textContent = cap;
      q("mandateHost").textContent = host;
      q("mandateRevoke").textContent = revoked;
      q("labState").textContent = state === "REVOKED" ? "REVOKED" : "LIVE DEMO";
    };

    q("issueMandate")?.addEventListener("click", async () => {
      setState("ISSUING", money(500), "stripe.test");
      try {
        const identity = await fetch("/api/t3/identity").then(r => r.json());
        if (!identity.connected) throw new Error("T3N identity is not verified.");
        localStorage.setItem("amg_t3n_mandate", JSON.stringify({ maxAmount: 500, host: "stripe.test", issuedAt: Date.now(), did: identity.did }));
        setState("SCOPED", money(500), "stripe.test");
        timeline("Mandate issued", `Agent ${identity.did} · function: payment.capture · cap: RM500 · host: stripe.test`);
      } catch (e) {
        setState("BLOCKED");
        timeline("Mandate blocked", e.message, false);
      }
    });

    async function preflight(action, amount) {
      const mandate = JSON.parse(localStorage.getItem("amg_t3n_mandate") || "null");
      if (!mandate) {
        timeline("No mandate", "Issue a scoped mandate before attempting a protected workflow.", false);
        return;
      }
      if (mandate.revoked) {
        timeline("Authorization rejected", "The local mandate has been revoked; no protected action should proceed.", false);
        return;
      }
      const r = await fetch("/api/t3/preflight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, amount }) });
      const d = await r.json();
      const withinMandate = amount <= mandate.maxAmount;
      const allowed = d.allowed && withinMandate;
      timeline(allowed ? "Preflight passed" : "Preflight blocked", `${action} · ${money(amount)} · identity=${d.policy?.identityVerified ? "verified" : "missing"} · mandate=${withinMandate ? "within scope" : "over cap"}`, allowed);
      q("labState").textContent = allowed ? "AUTHORIZED" : "BLOCKED";
    }

    q("prepareIntent")?.addEventListener("click", () => preflight("payment_intent", 500));
    q("overLimit")?.addEventListener("click", () => preflight("bank.transfer", 5000));
    q("revokeMandate")?.addEventListener("click", () => {
      const mandate = JSON.parse(localStorage.getItem("amg_t3n_mandate") || "null");
      if (!mandate) { timeline("Nothing to revoke", "No mandate exists yet.", false); return; }
      mandate.revoked = true;
      mandate.revokedAt = Date.now();
      localStorage.setItem("amg_t3n_mandate", JSON.stringify(mandate));
      setState("REVOKED", money(mandate.maxAmount), mandate.host, "REVOKED");
      timeline("Mandate revoked", "Future protected actions should fail authorization until a new mandate is issued.");
    });

    const existing = JSON.parse(localStorage.getItem("amg_t3n_mandate") || "null");
    if (existing) setState(existing.revoked ? "REVOKED" : "SCOPED", money(existing.maxAmount), existing.host, existing.revoked ? "REVOKED" : "ACTIVE");
  }

  const observer = new MutationObserver(injectTrustLab);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(injectTrustLab, 250);
})();
