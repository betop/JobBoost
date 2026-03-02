// Create a bidder — supports one or more profiles via profile_ids array
query bidders verb=POST {
  api_group = "bidders"
  auth = "admin"

  input {
    text full_name?
    email email? filters=trim|lower
    uuid[] profile_ids?
    bool is_active?
  }

  stack {
    precondition ($input.full_name != null) {
      error_type = "badrequest"
      error = "full_name is required"
    }
  
    precondition ($input.email != null) {
      error_type = "badrequest"
      error = "email is required"
    }
  
    var $ids {
      value = $input.profile_ids
    }
  
    conditional {
      if ($ids == null) {
        var.update $ids {
          value = []
        }
      }
    }
  
    db.add bidder {
      data = {
        created_at : now
        full_name  : $input.full_name
        email      : $input.email
        profile_ids: $ids
        is_active  : $input.is_active
        updated_at : now
      }
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
    profile_ids  : $b.profile_ids
    profile_names: $profile_names
    is_active    : $b.is_active
    created_at   : $b.created_at
  }
}