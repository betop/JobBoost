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
  
    var $payload {
      value = {}
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
  
    var.update $payload.is_active {
      value = $input.is_active
    }
  
    conditional {
      if ($input.is_approved != null) {
        var.update $payload.is_approved {
          value = $input.is_approved
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
    created_at   : $b.created_at
  }
}