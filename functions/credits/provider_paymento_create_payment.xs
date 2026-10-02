// Creates a hosted crypto payment request via Paymento (non-custodial gateway).
// Docs: https://docs.paymento.io/ — requires env var PAYMENTO_API_KEY.
// The customer selects the asset/network (e.g. USDT on TRC20 or BEP20) on
// Paymento's hosted checkout page, so no address/amount is returned here —
// only a token + redirect URL. Reconciliation happens via the webhook + verify call.
function "credits/provider_paymento_create_payment" {
  description = "Create a hosted crypto payment request via Paymento"

  input {
    decimal amount_usd {
      description = "Deposit amount in USD"
    }

    text order_id {
      description = "Our internal reference (crypto_deposit.id) sent as Paymento's orderId"
    }

    text return_url {
      description = "URL Paymento redirects the customer to after checkout"
    }

    text email? {
      description = "Admin's email address (optional, improves receipts)"
    }
  }

  stack {
    precondition ($input.amount_usd > 0) {
      error_type = "badrequest"
      error = "amount_usd must be greater than 0"
    }

    var $payload {
      value = {
        fiatAmount  : $input.amount_usd|to_text
        fiatCurrency: "USD"
        ReturnUrl   : $input.return_url
        orderId     : $input.order_id
        RiskSpeed   : 1
        EmailAddress: $input.email
      }
    }

    api.request {
      url = "https://api.paymento.io/v1/payment/request"
      method = "POST"
      params = $payload
      headers = [
        "Content-Type: application/json"
        "Accept: text/plain"
        "Api-key: " ~ $env.PAYMENTO_API_KEY
      ]
      timeout = 30
    } as $api_result

    precondition ($api_result.response.status == 200 && $api_result.response.result.success) {
      error_type = "standard"
      error = "Paymento payment request failed: " ~ ($api_result.response.result.message|first_notnull:"unknown error")
    }

    var $token {
      value = $api_result.response.result.body
    }

    var $result {
      value = {
        token      : $token
        payment_url: "https://app.paymento.io/gateway?token=" ~ $token
      }
    }
  }

  response = $result

  guid = "p7MzX3qTvL9rB2oNwKdJf6aYhSc"
}
