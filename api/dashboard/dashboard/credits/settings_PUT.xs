// Super-admin-only: update the global AI usage multiplier (1 to 10) and/or per-model
// multipliers. model_rates is an object of model id -> rate (1 to 10, selectable models only);
// a null value removes that model's override. It is merged into the stored map.
// Upserts the single billing_setting row.
query "dashboard/credits/settings" verb=PUT {
  api_group = "dashboard"
  auth = "users"

  input {
    decimal usage_rate? {
      description = "Global multiplier applied to raw AI provider cost (1 to 10)"
    }

    json model_rates? {
      description = "Per-model multipliers, e.g. {\"claude-haiku-5-5\": 2.5}; null value clears an override"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super_admin can update billing settings"
    }

    precondition ($input.usage_rate != null || $input.model_rates != null) {
      error_type = "badrequest"
      error = "Provide usage_rate and/or model_rates"
    }

    precondition ($input.usage_rate == null || ($input.usage_rate >= 1 && $input.usage_rate <= 10)) {
      error_type = "badrequest"
      error = "usage_rate must be between 1 and 10"
    }

    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $existing

    var $merged_rates {
      value = {}
    }

    conditional {
      if ($existing != null && $existing.model_rates != null) {
        var.update $merged_rates {
          value = $existing.model_rates
        }
      }
    }

    // Selectable models (keep in sync with ai/resolve_model)
    var $allowed_models {
      value = ["claude-haiku-4-5", "claude-haiku-5-5"]
    }

    conditional {
      if ($input.model_rates != null) {
        var $model_keys {
          value = $input.model_rates|keys
        }

        foreach ($model_keys) {
          each as $mk {
            precondition ($allowed_models|in:$mk) {
              error_type = "badrequest"
              error = "Unknown model in model_rates: " ~ $mk
            }

            var $mk_rate {
              value = $input.model_rates|get:$mk
            }

            conditional {
              if ($mk_rate == null) {
                var.update $merged_rates {
                  value = $merged_rates|unset:$mk
                }
              }

              else {
                precondition ($mk_rate >= 1 && $mk_rate <= 10) {
                  error_type = "badrequest"
                  error = "Rate for " ~ $mk ~ " must be between 1 and 10"
                }

                var.update $merged_rates {
                  value = $merged_rates|set:$mk:$mk_rate
                }
              }
            }
          }
        }
      }
    }

    // Global rate: the new one if sent, else keep the stored one, else 1.5
    var $new_global {
      value = $input.usage_rate|first_notnull:($existing.usage_rate|first_notnull:1.5)
    }

    conditional {
      if ($existing != null) {
        db.patch billing_setting {
          field_name = "id"
          field_value = $existing.id
          data = {usage_rate: $new_global, model_rates: $merged_rates, updated_at: "now"}
        } as $_
      }

      else {
        db.add billing_setting {
          data = {usage_rate: $new_global, model_rates: $merged_rates}
        } as $_
      }
    }

    function.run "credits/get_usage_rate" as $rate_info
  }

  response = {
    usage_rate         : $rate_info.usage_rate
    model_rates        : $rate_info.model_rates
    models             : $rate_info.models
    low_balance_threshold: $rate_info.low_balance_threshold
  }

  guid = "uP8wKcR2dYm5NxZq3VtLb7sJeHa"
}
