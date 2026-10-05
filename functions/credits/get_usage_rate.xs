// Returns the usage multiplier applied to raw AI provider cost, and the low-balance threshold.
// Falls back to 1.5 when no billing_setting row exists or the stored value is invalid (<= 0).
function "credits/get_usage_rate" {
  description = "Get the configured AI usage multiplier and low balance threshold"

  input {
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
  }

  response = {
    usage_rate         : $usage_rate
    low_balance_threshold: 5
  }

  guid = "gU4rAtE8nZ2xQwLs6VcMb9dKfYh"
}
