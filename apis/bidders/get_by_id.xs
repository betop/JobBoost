// Get bidder by id — returns profile_ids array and profile_names
query "bidders/{id}" verb=GET {
  api_group = "bidders"
  auth = "admin"

  input {
    uuid id?
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