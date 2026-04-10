// List all users — returns profile_ids and profile_names arrays
// Optionally filtered by type (bidder, admin, super_admin)
query users verb=GET {
  api_group = "users"
  auth = "users"

  input {
    text type?
  }

  stack {
    conditional {
      if ($input.type != null) {
        db.query users {
          where = $db.users.type == $input.type
          sort = {users.created_at: "desc"}
          return = {type: "list"}
        } as $users
      }
    
      else {
        db.query users {
          sort = {users.created_at: "desc"}
          return = {type: "list"}
        } as $users
      }
    }
  
    var $out {
      value = []
    }
  
    foreach ($users) {
      each as $b {
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
      
        array.push $out {
          value = {
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
      }
    }
  }

  response = $out
}