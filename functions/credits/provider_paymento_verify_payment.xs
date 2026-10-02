// Calls Paymento's Payment Verify API to get the authoritative order status
// for a given payment token. Should always be called after receiving a
// webhook/callback before crediting a deposit, per Paymento's integration guide.
// Docs: https://docs.paymento.io/ — requires env var PAYMENTO_API_KEY.
function "credits/provider_paymento_verify_payment" {
  description = "Verify a Paymento payment and return its authoritative order status"

  input {
    text token {
      description = "Payment token returned by the create-payment call"
    }
  }

  stack {
    api.request {
      url = "https://api.paymento.io/v1/payment/verify"
      method = "POST"
      params = {token: $input.token}
      headers = [
        "Content-Type: application/json"
        "Accept: application/json"
        "Api-key: " ~ $env.PAYMENTO_API_KEY
      ]
      timeout = 30
    } as $api_result

    precondition ($api_result.response.status == 200) {
      error_type = "standard"
      error = "Paymento verify call failed"
    }

    var $result {
      value = {
        success     : $api_result.response.result.success
        message     : $api_result.response.result.message
        order_status: $api_result.response.result.body.orderStatus
        settlement  : $api_result.response.result.body.settlement
      }
    }
  }

  response = $result

  guid = "n5RkY8oWqP2vT6xMcLbHj1dAeZf"
}
