// Pre-flight balance check — call BEFORE making an AI provider call so billable
// admins with insufficient credit are blocked before incurring cost.
// Non-billable users (super_admin, or bidders with no resolvable admin) always pass.
function "credits/check_sufficient_balance" {
  description = "Check whether the billing admin for a user has a positive credit balance"

  input {
    uuid user_id? {
      description = "id of the users record performing the AI action"
    }

    uuid profile_id? {
      description = "Optional profile being worked on; its billing admin takes priority"
    }

    decimal min_balance?=0 {
      description = "Minimum balance required to proceed (default: must be > 0)"
    }
  }

  stack {
    function.run "credits/resolve_profile_billing_admin" {
      input = {profile_id: $input.profile_id, user_id: $input.user_id}
    } as $billing

    var $has_sufficient_balance {
      value = true
    }

    var $balance {
      value = null
    }

    var $low_balance {
      value = false
    }

    var $warning_message {
      value = null
    }

    conditional {
      if ($billing.is_billable) {
        db.get users {
          field_name = "id"
          field_value = $billing.billing_admin_id
        } as $admin

        var.update $balance {
          value = $admin.credit_balance|first_notnull:0
        }

        var.update $has_sufficient_balance {
          value = $balance > $input.min_balance
        }

        conditional {
          if ($has_sufficient_balance && $balance < 5) {
            var.update $low_balance {
              value = true
            }

            var.update $warning_message {
              value = "Billing admin credit is low ($" ~ ($balance|round:2) ~ " left). Please add credit soon, usage will stop when it reaches $0."
            }
          }
        }
      }
    }
  }

  response = {
    is_billable          : $billing.is_billable
    billing_admin_id      : $billing.billing_admin_id
    balance               : $balance
    has_sufficient_balance: $has_sufficient_balance
    low_balance           : $low_balance
    warning_message       : $warning_message
  }

  guid = "b5OwR8yUnZ3qM1tKdVgSc6pXfLe"
}
