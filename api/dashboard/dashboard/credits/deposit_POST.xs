// Admin requests a crypto deposit to top up their credit balance, paid via NOWPayments.
// The customer chooses any coin/network enabled on the NOWPayments account on the hosted
// invoice page. Creates a pending crypto_deposit record and a hosted NOWPayments invoice; the balance
// is credited by credits/webhook-nowpayments once the payment is verified as finished.
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

    precondition ($input.amount_usd != null && $input.amount_usd >= 15) {
      error_type = "badrequest"
      error = "Minimum deposit amount is $15"
    }

    // Create the pending deposit row first so we have an id to use as the
    // NOWPayments order_id (helps us reconcile the callback)
    db.add crypto_deposit {
      data = {
        admin_id  : $user.id
        provider   : "nowpayments"
        currency   : "USDT_BEP20"
        amount_usd : $input.amount_usd
        status     : "pending"
      }
    } as $deposit

    // Admin panel base URL: ADMIN_PANEL_BASEURL env var if set, otherwise the default
    // production admin panel. Trailing slashes are stripped.
    var $admin_panel_raw {
      value = $env.ADMIN_PANEL_BASEURL|first_notempty:"https://hhq.vfprints.store"
    }

    var $admin_panel_base {
      value = $admin_panel_raw|trim:"/"
    }

    var $safe_return_url {
      value = $env.$api_baseurl ~ "/"
    }

    conditional {
      if ($admin_panel_base|starts_with:"https://") {
        var.update $safe_return_url {
          value = $admin_panel_base ~ "/dashboard/credits"
        }
      }
    }

    function.run "credits/provider_nowpayments_create_invoice" {
      input = {
        amount_usd      : $input.amount_usd
        order_id        : $deposit.id
        ipn_callback_url: "https://api.shsws-solutions.com/api:5kArnPy5/dashboard/credits/webhook-nowpayments"
        return_url      : $safe_return_url
      }
    } as $invoice

    db.patch crypto_deposit {
      field_name = "id"
      field_value = $deposit.id
      data = {
        external_invoice_id: $invoice.external_invoice_id
        payment_url         : $invoice.payment_url
      }
    } as $updated_deposit
  }

  response = {
    deposit_id  : $deposit.id
    provider    : "nowpayments"
    payment_url : $invoice.payment_url
    currency    : "USDT_BEP20"
    amount_usd  : $input.amount_usd
    status      : "pending"
  }

  guid = "e9ZrT4oXqW6pM2vLbKdHj8sFcYa"
}
