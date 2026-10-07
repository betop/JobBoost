// Resolves which admin account should be billed for an AI usage event, given the
// acting user record (bidder / admin / super_admin).
// - bidder  -> billed to the admin who created them (created_by), but only when that creator is an
//              existing, non-deleted admin. Bidders created by a super_admin (or whose creator is gone)
//              are not billable here (the profile's billing admin is resolved first elsewhere).
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

      elseif ($user.deleted == true) {
        // deleted users are never billed (nor billed on behalf of)
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
        // bidder — bill the admin that created them, but only when that creator is an existing,
        // non-deleted ADMIN. Bidders created by a super_admin (or whose creator is gone) are not billable.
        conditional {
          if ($user.created_by != null) {
            db.get users {
              field_name = "id"
              field_value = $user.created_by
            } as $creator

            conditional {
              if ($creator != null && $creator.deleted != true && $creator.type == "admin") {
                var.update $billing_admin_id {
                  value = $creator.id
                }

                var.update $is_billable {
                  value = true
                }
              }
            }
          }
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
