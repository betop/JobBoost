// Withdraws funds to the owner's own wallet via the NOWPayments Payout API.
// Flow: POST /v1/auth (email+password -> JWT), then POST /v1/payout with the JWT and our API key.
// Requires env vars: NOWPAYMENTS_API_KEY, NOWPAYMENTS_EMAIL, NOWPAYMENTS_PASSWORD,
// NOWPAYMENTS_PAYOUT_ADDRESS (USDT BEP20 / BSC wallet address).
// IMPORTANT: the NOWPayments Payout API only works from whitelisted IPs. Add the Xano
// instance's outbound IP(s) to the payout IP whitelist in the NOWPayments dashboard.
// 2FA: NOWPayments normally requires POST /v1/payout/{id}/verify with a 2FA code. XanoScript
// has no reliable HMAC-SHA1 + base32 primitives to compute a TOTP, so this function does NOT
// auto-verify. It returns status "created_pending_verification" and the owner must verify the
// payout in the NOWPayments dashboard (or disable payout 2FA / use their auto-verify setting).
// Currency code for USDT on BSC (BEP20) is "usdtbsc".
function "credits/provider_nowpayments_payout" {
  description = "Create a NOWPayments payout (USDT BEP20) to the owner's wallet"

  input {
    decimal amount {
      description = "Amount to withdraw, in USDT"
    }

    text deposit_id {
      description = "Our crypto_deposit.id, used as the payout reference"
    }
  }

  stack {
    precondition ($input.amount > 0) {
      error_type = "badrequest"
      error = "amount must be greater than 0"
    }

    precondition (($env.NOWPAYMENTS_API_KEY|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments payout is not configured (missing NOWPAYMENTS_API_KEY)"
    }

    precondition (($env.NOWPAYMENTS_EMAIL|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments payout is not configured (missing NOWPAYMENTS_EMAIL)"
    }

    precondition (($env.NOWPAYMENTS_PASSWORD|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments payout is not configured (missing NOWPAYMENTS_PASSWORD)"
    }

    precondition (($env.NOWPAYMENTS_PAYOUT_ADDRESS|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments payout is not configured (missing NOWPAYMENTS_PAYOUT_ADDRESS)"
    }

    api.request {
      url = "https://api.nowpayments.io/v1/auth"
      method = "POST"
      params = {email: $env.NOWPAYMENTS_EMAIL, password: $env.NOWPAYMENTS_PASSWORD}
      headers = [
        "Content-Type: application/json"
      ]
      timeout = 20
    } as $auth_result

    precondition ($auth_result.response.status == 200 && $auth_result.response.result.token != null) {
      error_type = "standard"
      error = "NOWPayments auth failed (status " ~ ($auth_result.response.status|to_text) ~ ")"
    }

    // NOWPayments allows at most 6 decimals
    var $payout_amount {
      value = $input.amount|round:6
    }

    var $payload {
      value = {
        withdrawals: [
          {
            address : $env.NOWPAYMENTS_PAYOUT_ADDRESS
            currency: "usdtbsc"
            amount  : $payout_amount
          }
        ]
      }
    }

    api.request {
      url = "https://api.nowpayments.io/v1/payout"
      method = "POST"
      params = $payload
      headers = [
        "Content-Type: application/json"
        "Authorization: Bearer " ~ $auth_result.response.result.token
        "x-api-key: " ~ $env.NOWPAYMENTS_API_KEY
      ]
      timeout = 30
    } as $payout_result

    precondition (($payout_result.response.status == 200 || $payout_result.response.status == 201) && $payout_result.response.result.id != null) {
      error_type = "standard"
      error = "NOWPayments payout failed (status " ~ ($payout_result.response.status|to_text) ~ "): " ~ (($payout_result.response.result|json_encode)|first_notnull:"unknown error")
    }

    var $result {
      value = {
        payout_id: $payout_result.response.result.id|to_text
        status   : "created_pending_verification"
      }
    }
  }

  response = $result

  guid = "Qp7ZxM3vTnK9wL4oRcBsYd2HjFu"
}
