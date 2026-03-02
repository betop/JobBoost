// List all bidders — returns profile_ids and profile_names arrays
query bidders verb=GET {
  api_group = "bidders"
  auth = "admin"

  input {
  }

  stack {
    db.query bidder {
      sort = {bidder.created_at: "desc"}
      return = {type: "list"}
    } as $bidders
  
    var $out {
      value = []
    }
  
    foreach ($bidders) {
      each as $b {
        // Resolve profile names for this bidder
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