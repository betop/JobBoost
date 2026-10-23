// Returns the usage multiplier applied to raw AI provider cost, and the low-balance threshold.
// Precedence: per-admin users.usage_rate (> 0, is_custom=true)
// > billing_setting.model_rates[model] (> 0) > billing_setting.usage_rate (> 0) > 1.5.
// Also returns model_rates (model id -> effective non-admin rate for every selectable model)
// and models (same with labels) for the settings screen.
function "credits/get_usage_rate" {
  description = "Get the configured AI usage multiplier and low balance threshold"

  input {
    uuid admin_id? {
      description = "Billing admin whose personal rate override (users.usage_rate) should apply"
    }

    text model? {
      description = "Anthropic model id the usage is billed on; selects the per-model rate"
    }
  }

  stack {
    var $global_rate {
      value = 1.5
    }

    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $setting

    conditional {
      if ($setting != null && $setting.usage_rate != null && $setting.usage_rate > 0) {
        var.update $global_rate {
          value = $setting.usage_rate
        }
      }
    }

    var $stored_model_rates {
      value = {}
    }

    conditional {
      if ($setting != null && $setting.model_rates != null) {
        var.update $stored_model_rates {
          value = $setting.model_rates
        }
      }
    }

    // Selectable models (keep in sync with ai/resolve_model)
    var $allowed_models {
      value = ["claude-haiku-4-5", "claude-haiku-5-5"]
    }

    var $model_rates {
      value = {}
    }

    var $models {
      value = []
    }

    foreach ($allowed_models) {
      each as $am {
        var $am_stored {
          value = $stored_model_rates|get:$am
        }

        var $am_rate {
          value = $global_rate
        }

        var $am_is_set {
          value = false
        }

        conditional {
          if ($am_stored != null && $am_stored > 0) {
            var.update $am_rate {
              value = $am_stored
            }

            var.update $am_is_set {
              value = true
            }
          }
        }

        function.run "ai/claude_haiku_rates" {
          input = {model: $am}
        } as $am_info

        var.update $model_rates {
          value = $model_rates|set:$am:$am_rate
        }

        var.update $models {
          value = $models|push:{model: $am, label: $am_info.label, usage_rate: $am_rate, is_set: $am_is_set}
        }
      }
    }

    var $usage_rate {
      value = $global_rate
    }

    conditional {
      if ($input.model != null && $input.model != "") {
        var $model_stored {
          value = $stored_model_rates|get:$input.model
        }

        conditional {
          if ($model_stored != null && $model_stored > 0) {
            var.update $usage_rate {
              value = $model_stored
            }
          }
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
    default_usage_rate : $global_rate
    model_rates        : $model_rates
    models             : $models
    low_balance_threshold: 5
  }

  guid = "gU4rAtE8nZ2xQwLs6VcMb9dKfYh"
}
