// List all users — returns profile_ids and profile_names arrays
// super_admins: optional ?type= filter, see all users
// admins: always see only bidders they created or that are assigned to them
query users verb=GET {
  api_group = "users"
  auth = "users"

  input {
    text type?
  }

  stack {
    // Get auth user to determine access scope
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Fetch the candidate pool
    conditional {
      if ($auth_user.type == "super_admin") {
        // Super admin: respect ?type filter or return all
        conditional {
          if ($input.type != null) {
            db.query users {
              where = $db.users.type == $input.type
              sort = {users.created_at: "desc"}
              return = {type: "list"}
            } as $all_users
          }
        
          else {
            db.query users {
              sort = {users.created_at: "desc"}
              return = {type: "list"}
            } as $all_users
          }
        }
      
        var $users {
          value = $all_users
        }
      }
    
      else {
        // Admin: always fetch only bidders
        db.query users {
          where = $db.users.type == "bidder"
          sort = {users.created_at: "desc"}
          return = {type: "list"}
        } as $all_bidders
      
        // Build a safe copy of assigned IDs (handle null)
        var $assigned {
          value = $auth_user.assigned_bidder_ids
        }
      
        conditional {
          if ($assigned == null) {
            var.update $assigned {
              value = []
            }
          }
        }
      
        // Filter to only bidders created by or assigned to this admin
        var $users {
          value = []
        }
      
        foreach ($all_bidders) {
          each as $u {
            // Check 1: created by this admin
            conditional {
              if ($u.created_by == $auth.id) {
                array.push $users {
                  value = $u
                }
              }
            
              else {
                // Check 2: in this admin's assigned_bidder_ids
                foreach ($assigned) {
                  each as $bid {
                    conditional {
                      if ($bid == $u.id) {
                        array.push $users {
                          value = $u
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
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
            is_approved  : $b.is_approved
            created_at   : $b.created_at
          }
        }
      }
    }
  }

  response = $out
}