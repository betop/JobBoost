// Super-admin-only: update the global AI usage multiplier (1 to 10). Upserts the single
// billing_setting row.
query "dashboard/credits/settings" verb=PUT {
  api_group = "dashboard"
  auth = "users"

  input {
    decimal usage_rate {
      description = "Multiplier applied to raw AI provider cost (1 to 10)"
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

    precondition ($input.usage_rate != null && $input.usage_rate >= 1 && $input.usage_rate <= 10) {
      error_type = "badrequest"
      error = "usage_rate must be between 1 and 10"
    }

    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $existing

    conditional {
      if ($existing != null) {
        db.patch billing_setting {
          field_name = "id"
          field_value = $existing.id
          data = {usage_rate: $input.usage_rate, updated_at: "now"}
        } as $_
      }

      else {
        db.add billing_setting {
          data = {usage_rate: $input.usage_rate}
        } as $_
      }
    }

    function.run "credits/get_usage_rate" as $rate_info
  }

  response = {
    usage_rate         : $rate_info.usage_rate
    low_balance_threshold: $rate_info.low_balance_threshold
  }

  guid = "uP8wKcR2dYm5NxZq3VtLb7sJeHa"
}
