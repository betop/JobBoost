// Returns the global billing settings: the usage multiplier applied to raw AI cost and the
// low-balance warning threshold. Any active admin or super_admin may read it.
query "dashboard/credits/settings" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
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

    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only admin or super_admin accounts can view billing settings"
    }

    function.run "credits/get_usage_rate" as $rate_info
  }

  response = {
    usage_rate         : $rate_info.usage_rate
    low_balance_threshold: $rate_info.low_balance_threshold
  }

  guid = "sT3gQvN7kXz2LmWc9BdYr5pAeUh"
}
