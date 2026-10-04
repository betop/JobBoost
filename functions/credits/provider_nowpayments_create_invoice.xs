// Creates a hosted crypto invoice via NOWPayments (POST /v1/invoice).
// Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
// Requires env var NOWPAYMENTS_API_KEY. The customer pays on NOWPayments' hosted
// invoice page (invoice_url); we receive status updates on ipn_callback_url.
// order_id carries our crypto_deposit.id for reconciliation.
function "credits/provider_nowpayments_create_invoice" {
  description = "Create a hosted USDT invoice via NOWPayments"

  input {
    decimal amount_usd {
      description = "Deposit amount in USD"
    }

    text order_id {
      description = "Our internal reference (crypto_deposit.id) sent as NOWPayments order_id"
    }

    text pay_currency {
      description = "NOWPayments coin code, e.g. usdttrc20 or usdtbsc"
    }

    text ipn_callback_url {
      description = "URL NOWPayments posts payment status updates to"
    }

    text return_url {
      description = "URL used for the success/cancel redirects"
    }
  }

  stack {
    precondition ($input.amount_usd > 0) {
      error_type = "badrequest"
      error = "amount_usd must be greater than 0"
    }

    precondition (($env.NOWPAYMENTS_API_KEY|first_notnull:"") != "") {
      error_type = "standard"
      error = "NOWPayments is not configured (missing NOWPAYMENTS_API_KEY)"
    }

    var $payload {
      value = {
        price_amount     : $input.amount_usd
        price_currency   : "usd"
        pay_currency     : $input.pay_currency
        order_id         : $input.order_id
        order_description: "Credit top-up"
        ipn_callback_url : $input.ipn_callback_url
        success_url      : $input.return_url
        cancel_url       : $input.return_url
      }
    }

    api.request {
      url = "https://api.nowpayments.io/v1/invoice"
      method = "POST"
      params = $payload
      headers = [
        "Content-Type: application/json"
        "x-api-key: " ~ $env.NOWPAYMENTS_API_KEY
      ]
      timeout = 30
    } as $api_result

    precondition ($api_result.response.status == 200 && $api_result.response.result.invoice_url != null) {
      error_type = "standard"
      error = "NOWPayments invoice creation failed: " ~ (($api_result.response.result|json_encode)|first_notnull:"unknown error")
    }

    var $result {
      value = {
        external_invoice_id: $api_result.response.result.id|to_text
        payment_url        : $api_result.response.result.invoice_url
      }
    }
  }

  response = $result

  guid = "Rn4WvK8pQxL2mT6oZdBsYc9HjFe"
}
