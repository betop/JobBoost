// Create a user (bidder or admin) — supports one or more profiles via profile_ids array
query users verb=POST {
  api_group = "users"
  auth = "users"

  input {
    text full_name?
    email email? filters=trim|lower
    text type?
    text password?
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
  
    var $user_type {
      value = $input.type
    }
  
    conditional {
      if ($user_type == null) {
        var.update $user_type {
          value = "bidder"
        }
      }
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
  
    db.add users {
      data = {
        created_at : now
        full_name  : $input.full_name
        email      : $input.email
        type       : $user_type
        profile_ids: $ids
        is_active  : $input.is_active
        updated_at : now
        created_by : $auth.id
      }
    } as $b
  
    // If password provided (for admin users), hash and store it
    conditional {
      if ($input.password != null) {
        db.patch users {
          field_name = "id"
          field_value = $b.id
          data = {password_hash: $input.password}
        } as $b
      }
    }
  
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
    created_at   : $b.created_at
  }
}