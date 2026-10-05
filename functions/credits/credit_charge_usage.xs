// Charges an admin's credit_balance for an AI usage event at the configured multiplier (default 1.5x) of the raw provider cost.
// Amounts keep sub-cent precision (rounded to 8 decimals, never to cents).
// Call this AFTER the AI call completes (so the real token-based cost is known).
// Throws accessdenied if the billing admin has insufficient balance — callers that need
// a pre-flight check should call credits/check_sufficient_balance before making the AI call.
function "credits/credit_charge_usage" {
  description = "Deduct configured-rate AI usage cost from an admin's credit balance and log the transaction"

  input {
    uuid admin_id {
      description = "users.id of the admin to bill (never a super_admin)"
    }

    decimal raw_cost_usd {
      description = "Actual provider cost in USD, before markup"
    }

    text related_log_table? {
      description = "e.g. generation_log, chat_log, mail_triage_log"
    }

    uuid related_log_id? {
      description = "id of the related log row"
    }

    bool allow_negative?=false {
      description = "If true, charge proceeds even if it drives balance negative (used when balance was already verified pre-flight)"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.admin_id
    } as $admin

    precondition ($admin != null) {
      error_type = "notfound"
      error = "Billing admin not found"
    }

    precondition ($admin.type != "super_admin") {
      error_type = "badrequest"
      error = "super_admin accounts are not billable"
    }

    function.run "credits/get_usage_rate" as $rate_info

    var $charge_amount {
      value = ($input.raw_cost_usd * $rate_info.usage_rate)|round:8
    }

    var $current_balance {
      value = $admin.credit_balance|first_notnull:0
    }

    var $new_balance {
      value = ($current_balance - $charge_amount)|round:8
    }

    precondition ($input.allow_negative || $new_balance >= 0) {
      error_type = "accessdenied"
      error = "Insufficient credit balance. Please deposit USDT to continue generating."
    }

    db.patch users {
      field_name = "id"
      field_value = $input.admin_id
      data = {credit_balance: $new_balance}
    } as $_

    db.add credit_transaction {
      data = {
        admin_id        : $input.admin_id
        type             : "usage"
        amount           : $charge_amount * -1
        balance_after    : $new_balance
        related_log_table: $input.related_log_table
        related_log_id   : $input.related_log_id
        note             : "AI usage charge (raw cost $" ~ $input.raw_cost_usd ~ " x" ~ $rate_info.usage_rate ~ ")"
      }
    } as $txn
  }

  response = {
    charged      : $charge_amount
    new_balance  : $new_balance
    transaction  : $txn
  }

  guid = "c2NvQ7xTmY4pL9sJbWfRa1oVeHd"
}
