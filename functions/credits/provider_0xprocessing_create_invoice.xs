// Creates a USDT (BEP20/TRC20) deposit invoice via the 0xProcessing API.
// Docs: https://docs.0xprocessing.com/ — requires env vars ZEROX_API_KEY, ZEROX_SECRET_KEY.
// Returns the raw provider response; caller is responsible for persisting the crypto_deposit record.
function "credits/provider_0xprocessing_create_invoice" {
  description = "Create a USDT deposit invoice (BEP20 or TRC20) via 0xProcessing"

  input {
    decimal amount_usd {
      description = "Deposit amount in USD"
    }

    text currency {
      description = "USDT_BEP20 or USDT_TRC20"
    }

    text order_id {
      description = "Our internal reference (crypto_deposit.id) sent as the provider order id"
    }

    text callback_url? {
      description = "Webhook URL 0xProcessing should call on payment status change"
    }
  }

  stack {
    precondition ($input.amount_usd > 0) {
      error_type = "badrequest"
      error = "amount_usd must be greater than 0"
    }

    precondition ($input.currency == "USDT_BEP20" || $input.currency == "USDT_TRC20") {
      error_type = "badrequest"
      error = "currency must be USDT_BEP20 or USDT_TRC20"
    }

    // Map our internal currency codes to 0xProcessing's expected asset/network identifiers
    var $provider_currency {
      value = $input.currency == "USDT_BEP20" ? "USDT" : "USDT"
    }

    var $provider_network {
      value = $input.currency == "USDT_BEP20" ? "BSC" : "TRX"
    }

    var $payload {
      value = {
        merchant_order_id: $input.order_id
        amount           : $input.amount_usd
        currency         : "USD"
        pay_currency     : $provider_currency
        network          : $provider_network
        callback_url     : $input.callback_url
      }
    }

    api.request {
      url = "https://api.0xprocessing.com/v1/invoices"
      method = "POST"
      params = $payload
      headers = [
        "Content-Type: application/json"
        "X-Api-Key: " ~ $env.ZEROX_API_KEY
        "X-Secret-Key: " ~ $env.ZEROX_SECRET_KEY
      ]
      timeout = 30
    } as $api_result

    precondition ($api_result.response.status == 200 || $api_result.response.status == 201) {
      error_type = "standard"
      error = "0xProcessing invoice creation failed: " ~ (($api_result.response.result|to_text)|first_notnull:"unknown error")
    }

    var $result {
      value = {
        external_invoice_id: $api_result.response.result.id
        pay_address        : $api_result.response.result.address
        payment_url         : $api_result.response.result.payment_url
        amount_crypto       : $api_result.response.result.pay_amount
        raw                 : $api_result.response.result
      }
    }
  }

  response = $result

  guid = "f8KpR2nVtQ5sX1oZmLwA7dYjBc3"
}
