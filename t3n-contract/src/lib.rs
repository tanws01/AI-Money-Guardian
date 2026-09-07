wit_bindgen::generate!({
    world: "money-guardian",
    path: "wit",
    additional_derives: [serde::Deserialize, serde::Serialize],
    generate_all,
});

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct PaymentRequest {
    amount: f64,
    currency: String,
    category: String,
    max_amount: f64,
    consent: bool,
}

#[derive(Serialize)]
struct Decision {
    allowed: bool,
    amount: f64,
    currency: String,
    category: String,
    policy: &'static str,
    reason: String,
}

struct Component;

impl exports::z::money_guardian::contracts::Guest for Component {
    fn authorize_payment(
        req: exports::z::money_guardian::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("authorize-payment: missing input")?;
        let request: PaymentRequest = serde_json::from_slice(&input)
            .map_err(|e| format!("invalid payment request: {e}"))?;

        let allowed = request.consent
            && request.amount > 0.0
            && request.amount <= request.max_amount
            && request.currency == "MYR"
            && request.category != "cash_withdrawal";

        let reason = if !request.consent {
            "explicit user consent is required"
        } else if request.amount > request.max_amount {
            "amount exceeds the protected spending mandate"
        } else if request.currency != "MYR" {
            "currency is outside the protected demo policy"
        } else if request.category == "cash_withdrawal" {
            "cash withdrawal is outside the protected demo policy"
        } else {
            "payment satisfies the protected policy"
        };

        let result = Decision {
            allowed,
            amount: request.amount,
            currency: request.currency,
            category: request.category,
            policy: "money-guardian-v1",
            reason: reason.to_string(),
        };

        serde_json::to_vec(&result).map_err(|e| format!("encode decision: {e}"))
    }
}

export!(Component);
