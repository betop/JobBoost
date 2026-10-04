// Admin requests a crypto deposit (e.g. USDT via BEP20/TRC20, chosen on Paymento's
// hosted checkout) to top up their credit balance.
// Creates a pending crypto_deposit record and a payment request via Paymento.
// super_admin accounts cannot deposit (billing does not apply to them).
query "dashboard/credits/deposit" verb=POST {
  api_group = "dashboard"
  auth = "users"

  input {
    decimal amount_usd {
      description = "Deposit amount in USD"
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

    precondition ($input.amount_usd != null && $input.amount_usd >= 1) {
      error_type = "badrequest"
      error = "Minimum deposit amount is $1"
    }

    // Create the pending deposit row first so we have an id to use as
    // Paymento's orderId (helps us reconcile the callback/webhook)
    db.add crypto_deposit {
      data = {
        admin_id  : $user.id
        provider   : "paymento"
        currency   : "USDT"
        amount_usd : $input.amount_usd
        status     : "pending"
      }
    } as $deposit

    var $admin_panel_base {
      value = $env.ADMIN_PANEL_BASEURL|first_notnull:""
    }

    var $safe_return_url {
      value = $env.$api_baseurl ~ "/"
    }

    conditional {
      if ($admin_panel_base|starts_with:"https://") {
        var.update $safe_return_url {
          value = $admin_panel_base ~ "/dashboard/credits?deposit_id=" ~ $deposit.id
        }
      }
    }

    function.run "credits/provider_paymento_create_payment" {
      input = {
        amount_usd : $input.amount_usd
        order_id   : $deposit.id
        return_url : $safe_return_url
        email      : $user.email
      }
    } as $payment

    db.patch crypto_deposit {
      field_name = "id"
      field_value = $deposit.id
      data = {
        external_invoice_id: $payment.token
        payment_url         : $payment.payment_url
      }
    } as $updated_deposit
  }

  response = {
    deposit_id  : $deposit.id
    payment_url : $payment.payment_url
    currency    : "USDT"
    amount_usd  : $input.amount_usd
    status      : "pending"
  }

  guid = "e9ZrT4oXqW6pM2vLbKdHj8sFcYa"
}
