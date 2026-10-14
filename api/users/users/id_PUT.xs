// Update user — supports one or more profiles via profile_ids array
// assigned_bidder_ids can be set by super_admin to assign bidders to an admin
query "users/{id}" verb=PUT {
  api_group = "users"
  auth = "users"

  input {
    uuid id?
    text full_name?
    email email? filters=trim|lower
    text type?
    uuid[] profile_ids?
    uuid[] assigned_bidder_ids?
    bool is_active?
    bool is_approved?
    text assigned_ip?
    decimal usage_rate? {
      description = "Personal price rate multiplier for this admin (1-10); super_admin only"
    }

    bool clear_usage_rate? {
      description = "Remove the personal price rate so the global default applies; super_admin only"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.id
    } as $b
  
    precondition ($b != null) {
      error_type = "notfound"
      error = "User not found"
    }
  
    precondition ($b.deleted != true) {
      error_type = "badrequest"
      error = "User has been deleted"
    }
  
    var $payload {
      value = {}
    }

    // Personal price rate: only a super_admin may change it, and only on admin accounts (the billed party)
    conditional {
      if ($input.usage_rate != null || $input.clear_usage_rate == true) {
        db.get users {
          field_name = "id"
          field_value = $auth.id
        } as $rate_caller

        precondition ($rate_caller != null && $rate_caller.type == "super_admin") {
          error_type = "accessdenied"
          error = "Only super_admin can set a price rate"
        }

        precondition ($b.type == "admin") {
          error_type = "badrequest"
          error = "A price rate can only be set on admin accounts"
        }

        conditional {
          if ($input.clear_usage_rate == true) {
            var.update $payload.usage_rate {
              value = null
            }
          }

          elseif ($input.usage_rate != null) {
            precondition ($input.usage_rate >= 1 && $input.usage_rate <= 10) {
              error_type = "badrequest"
              error = "usage_rate must be between 1 and 10"
            }

            var.update $payload.usage_rate {
              value = $input.usage_rate
            }
          }
        }
      }
    }
  
    conditional {
      if ($input.full_name != null) {
        var.update $payload.full_name {
          value = $input.full_name
        }
      }
    }
  
    conditional {
      if ($input.email != null) {
        var.update $payload.email {
          value = $input.email
        }
      }
    }
  
    conditional {
      if ($input.type != null) {
        var.update $payload.type {
          value = $input.type
        }
      }
    }
  
    conditional {
      if ($input.profile_ids != null) {
        var.update $payload.profile_ids {
          value = $input.profile_ids
        }
      }
    }
  
    conditional {
      if ($input.assigned_bidder_ids != null) {
        var.update $payload.assigned_bidder_ids {
          value = $input.assigned_bidder_ids
        }
      }
    }
  
    // Only touch is_active when the caller sent it (e.g. approving a user sends only is_approved)
    conditional {
      if ($input.is_active != null) {
        var.update $payload.is_active {
          value = $input.is_active
        }
      }
    }
  
    conditional {
      if ($input.is_approved != null) {
        var.update $payload.is_approved {
          value = $input.is_approved
        }
      }
    }
  
    conditional {
      if ($input.assigned_ip != null) {
        var.update $payload.assigned_ip {
          value = $input.assigned_ip
        }
      }
    }
  
    var.update $payload.updated_at {
      value = now
    }
  
    db.patch users {
      field_name = "id"
      field_value = $b.id
      data = $payload
    } as $b
  
    // Resolve profile names
    var $profile_names {
      value = []
    }
  
    foreach ($b.profile_ids) {
      each as $pid {
        db.get profile {
          field_name = "id"
          field_value = $pid
        } as $prof
      
        conditional {
          if ($prof != null) {
            var.update $profile_names {
              value = $profile_names|push:$prof.full_name
            }
          }
        }
      }
    }
  }

  response = {
    id           : $b.id
    full_name    : $b.full_name
    email        : $b.email
    type         : $b.type
    profile_ids  : $b.profile_ids
    profile_names: $profile_names
    is_active    : $b.is_active
    is_approved  : $b.is_approved
    assigned_ip  : $b.assigned_ip
    usage_rate   : $b.usage_rate
    created_at   : $b.created_at
  }

  guid = "Pb_h07_Ovc0v0lU1QRMd5_0Xdfg"
}