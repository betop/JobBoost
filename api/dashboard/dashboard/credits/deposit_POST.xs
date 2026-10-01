// Admin requests a USDT (BEP20/TRC20) deposit to top up their credit balance.
// Creates a pending crypto_deposit record and an invoice via 0xProcessing.
// super_admin accounts cannot deposit (billing does not apply to them).
query "dashboard/credits/deposit" verb=POST {
  api_group = "dashboard"
  auth = "users"

  input {
    decimal amount_usd {
      description = "Deposit amount in USD"
    }

    text currency {
      description = "USDT_BEP20 or USDT_TRC20"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && $user.is_active) {
      error_type = "accessdenied"
      error = "User not authorized"
    }

    precondition ($user.type == "admin") {
      error_type = "accessdenied"
      error = "Only admin accounts can deposit credits"
    }

    precondition ($input.amount_usd != null && $input.amount_usd >= 10) {
      error_type = "badrequest"
      error = "Minimum deposit amount is $10"
    }

    precondition ($input.currency == "USDT_BEP20" || $input.currency == "USDT_TRC20") {
      error_type = "badrequest"
      error = "currency must be USDT_BEP20 or USDT_TRC20"
    }

    // Create the pending deposit row first so we have an id to use as the
    // provider's merchant_order_id (helps us reconcile the webhook callback)
    db.add crypto_deposit {
      data = {
        admin_id      : $user.id
        provider       : "0xprocessing"
        currency       : $input.currency
        amount_usd     : $input.amount_usd
        status         : "pending"
      }
    } as $deposit

    function.run "credits/provider_0xprocessing_create_invoice" {
      input = {
        amount_usd  : $input.amount_usd
        currency     : $input.currency
        order_id     : $deposit.id
        callback_url : $env.$api_baseurl ~ "/api:5kArnPy5/dashboard/credits/webhook"
      }
    } as $invoice

    db.patch crypto_deposit {
      field_name = "id"
      field_value = $deposit.id
      data = {
        external_invoice_id: $invoice.external_invoice_id
        pay_address        : $invoice.pay_address
        payment_url        : $invoice.payment_url
        amount_crypto       : $invoice.amount_crypto
      }
    } as $updated_deposit
  }

  response = {
    deposit_id   : $deposit.id
    pay_address  : $invoice.pay_address
    payment_url  : $invoice.payment_url
    amount_crypto: $invoice.amount_crypto
    currency     : $input.currency
    amount_usd   : $input.amount_usd
    status       : "pending"
  }

  guid = "e9ZrT4oXqW6pM2vLbKdHj8sFcYa"
}
