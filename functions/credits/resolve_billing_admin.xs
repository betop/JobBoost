// Resolves which admin account should be billed for an AI usage event, given the
// acting user record (bidder / admin / super_admin).
// - bidder  -> billed to the admin who created them (created_by), or the first
//              admin in their chain if created_by is not an admin (fallback to created_by as-is)
// - admin   -> billed to themselves
// - super_admin -> no billing (returns billing_admin_id = null, is_billable = false)
function "credits/resolve_billing_admin" {
  description = "Resolve the admin account to bill for a user's AI usage"

  input {
    uuid user_id {
      description = "id of the users record performing the AI action (bidder, admin, or super_admin)"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $user

    precondition ($user != null) {
      error_type = "notfound"
      error = "User not found"
    }

    var $billing_admin_id {
      value = null
    }

    var $is_billable {
      value = false
    }

    conditional {
      if ($user.type == "super_admin") {
        var.update $billing_admin_id {
          value = null
        }

        var.update $is_billable {
          value = false
        }
      }

      elseif ($user.type == "admin") {
        var.update $billing_admin_id {
          value = $user.id
        }

        var.update $is_billable {
          value = true
        }
      }

      else {
        // bidder — bill the admin that created them
        var.update $billing_admin_id {
          value = $user.created_by
        }

        var.update $is_billable {
          value = $user.created_by != null
        }
      }
    }
  }

  response = {
    billing_admin_id: $billing_admin_id
    is_billable     : $is_billable
  }

  guid = "a7MxP3qLrW8sZ2vNbTdHj5oYeKg"
}
