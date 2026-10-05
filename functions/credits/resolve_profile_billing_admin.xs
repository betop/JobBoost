// Resolves the admin to bill for an AI usage event, taking the profile into account.
// Priority:
//   1. profile.billing_admin_id (if that user exists and is not a super_admin)
//   2. profile.created_by, if that user is an admin
//   3. fallback to credits/resolve_billing_admin(user_id) -- the acting-user rule. This is ONLY used
//      for legacy profiles that have neither a billing_admin_id nor an admin creator; whenever a profile
//      resolves in 1 or 2, the acting user (who may be a bidder) never decides who pays.
function "credits/resolve_profile_billing_admin" {
  description = "Resolve the billing admin for a profile, falling back to the acting user"

  input {
    uuid profile_id? {
      description = "Profile being worked on (optional)"
    }

    uuid user_id? {
      description = "id of the users record performing the AI action (optional; without it, no fallback to the acting user is possible)"
    }
  }

  stack {
    var $billing_admin_id {
      value = null
    }

    var $is_billable {
      value = false
    }

    var $resolved {
      value = false
    }

    conditional {
      if ($input.profile_id != null) {
        db.get profile {
          field_name = "id"
          field_value = $input.profile_id
        } as $prof

        conditional {
          if ($prof != null && $prof.billing_admin_id != null) {
            db.get users {
              field_name = "id"
              field_value = $prof.billing_admin_id
            } as $designated

            conditional {
              if ($designated != null && $designated.type != "super_admin") {
                var.update $billing_admin_id {
                  value = $designated.id
                }

                var.update $is_billable {
                  value = true
                }

                var.update $resolved {
                  value = true
                }
              }
            }
          }
        }

        conditional {
          if (!$resolved && $prof != null && $prof.created_by != null) {
            db.get users {
              field_name = "id"
              field_value = $prof.created_by
            } as $creator

            conditional {
              if ($creator != null && $creator.type == "admin") {
                var.update $billing_admin_id {
                  value = $creator.id
                }

                var.update $is_billable {
                  value = true
                }

                var.update $resolved {
                  value = true
                }
              }
            }
          }
        }
      }
    }

    conditional {
      if (!$resolved && $input.user_id != null) {
        function.run "credits/resolve_billing_admin" {
          input = {user_id: $input.user_id}
        } as $fallback

        var.update $billing_admin_id {
          value = $fallback.billing_admin_id
        }

        var.update $is_billable {
          value = $fallback.is_billable
        }
      }
    }
  }

  response = {
    billing_admin_id: $billing_admin_id
    is_billable     : $is_billable
  }

  guid = "rP4kWm7XvQ2nBt9ZsLdHy6cJaEu"
}
