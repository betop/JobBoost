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

    int input_tokens? {
      description = "Uncached input tokens behind raw_cost_usd (null when unknown)"
    }

    int output_tokens? {
      description = "Output tokens behind raw_cost_usd"
    }

    int cache_creation_tokens? {
      description = "Cache-write tokens behind raw_cost_usd"
    }

    int cache_read_tokens? {
      description = "Cache-read tokens behind raw_cost_usd"
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

    function.run "credits/get_usage_rate" {
      input = {}
    } as $rate_info

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

    var $negative_amount {
      value = 0 - $charge_amount
    }

    db.add credit_transaction {
      data = {
        admin_id        : $input.admin_id
        type             : "usage"
        amount           : $negative_amount
        balance_after    : $new_balance
        related_log_table: $input.related_log_table
        related_log_id   : $input.related_log_id
        related_deposit_id: null
        input_tokens     : $input.input_tokens|first_notnull:0
        output_tokens    : $input.output_tokens|first_notnull:0
        cache_creation_tokens: $input.cache_creation_tokens|first_notnull:0
        cache_read_tokens: $input.cache_read_tokens|first_notnull:0
        raw_cost_usd     : $input.raw_cost_usd
        usage_rate       : $rate_info.usage_rate
        note             : "AI usage charge (raw cost $" ~ $input.raw_cost_usd ~ " x" ~ $rate_info.usage_rate ~ ")"
      }
    } as $txn

    // Ledger row is written first; the balance is only debited once the row exists.
    db.patch users {
      field_name = "id"
      field_value = $input.admin_id
      data = {credit_balance: $new_balance}
    } as $_
  }

  response = {
    charged      : $charge_amount
    new_balance  : $new_balance
    transaction  : $txn
  }

  guid = "c2NvQ7xTmY4pL9sJbWfRa1oVeHd"
}
