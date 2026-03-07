// Update bidder — supports one or more profiles via profile_ids array (v2)
query "bidders/{id}" verb=PUT {
  api_group = "bidders"
  auth = "admin"

  input {
    uuid id?
    text full_name?
    email email? filters=trim|lower
    uuid[] profile_ids?
    bool is_active?
  }

  stack {
    db.get bidder {
      field_name = "id"
      field_value = $input.id
    } as $b
  
    precondition ($b != null) {
      error_type = "notfound"
      error = "Bidder not found"
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
      if ($input.profile_ids != null) {
        var.update $payload.profile_ids {
          value = $input.profile_ids
        }
      }
    }
  
    conditional {
      if ($input.is_active != null) {
        var.update $payload.is_active {
          value = $input.is_active
        }
      }
    }
  
    var.update $payload.updated_at {
      value = now
    }
  
    db.patch bidder {
      field_name = "id"
      field_value = $b.id
      data = $payload
    } as $b
  
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
    profile_ids  : $b.profile_ids
    profile_names: $profile_names
    is_active    : $b.is_active
    created_at   : $b.created_at
  }
}