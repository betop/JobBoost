// Fetches the authoritative status of a NOWPayments payment (GET /v1/payment/{id}),
// authenticated with our own API key. Used by the IPN webhook instead of trusting the
// callback body (inbound signature headers are not readable in XanoScript).
function "credits/provider_nowpayments_get_payment" {
  description = "Get a NOWPayments payment by id (server-to-server verification)"

  input {
    text payment_id {
      description = "NOWPayments payment_id from the IPN callback"
    }
  }

  stack {
    precondition (($env.NOWPAYMENTS_API_KEY|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments is not configured (missing NOWPAYMENTS_API_KEY)"
    }

    api.request {
      url = "https://api.nowpayments.io/v1/payment/" ~ ($input.payment_id|url_encode)
      method = "GET"
      headers = [
        "x-api-key: " ~ $env.NOWPAYMENTS_API_KEY
      ]
      timeout = 20
    } as $api_result

    precondition ($api_result.response.status == 200 && $api_result.response.result.payment_status != null) {
      error_type = "standard"
      error = "NOWPayments payment lookup failed"
    }
  }

  response = {
    payment_status   : $api_result.response.result.payment_status
    order_id         : $api_result.response.result.order_id
    price_amount     : $api_result.response.result.price_amount
    price_currency   : $api_result.response.result.price_currency
    parent_payment_id: $api_result.response.result.parent_payment_id
  }

  guid = "Wc3PzN7vQkL5mX2oTdRsYb8HjFa"
}
