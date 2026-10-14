// Returns the usage multiplier applied to raw AI provider cost, and the low-balance threshold.
// Per-user rate: when admin_id is given and that user has users.usage_rate > 0 it wins;
// otherwise the global billing_setting rate; otherwise 1.5 (no row / invalid value).
function "credits/get_usage_rate" {
  description = "Get the configured AI usage multiplier and low balance threshold"

  input {
    uuid admin_id? {
      description = "Billing admin whose personal rate override (users.usage_rate) should apply"
    }
  }

  stack {
    var $usage_rate {
      value = 1.5
    }

    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $setting

    conditional {
      if ($setting != null && $setting.usage_rate != null && $setting.usage_rate > 0) {
        var.update $usage_rate {
          value = $setting.usage_rate
        }
      }
    }

    var $is_custom {
      value = false
    }

    conditional {
      if ($input.admin_id != null) {
        db.get users {
          field_name = "id"
          field_value = $input.admin_id
        } as $rate_user

        conditional {
          if ($rate_user != null && $rate_user.usage_rate != null && $rate_user.usage_rate > 0) {
            var.update $usage_rate {
              value = $rate_user.usage_rate
            }

            var.update $is_custom {
              value = true
            }
          }
        }
      }
    }
  }

  response = {
    is_custom          : $is_custom
    usage_rate         : $usage_rate
    low_balance_threshold: 5
  }

  guid = "gU4rAtE8nZ2xQwLs6VcMb9dKfYh"
}
