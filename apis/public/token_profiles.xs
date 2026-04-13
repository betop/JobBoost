// Fetch current profiles for a Chrome extension token without side effects
query "public/token-profiles" verb=POST {
  api_group = "public"

  input {
    text token?
  }

  stack {
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing token"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid token"
    }
  
    precondition ($access.is_active) {
      error_type = "accessdenied"
      error = "Token has been revoked"
    }
  
    db.get users {
      field_name = "id"
      field_value = $access.user_id
    } as $bid
  
    precondition ($bid != null) {
      error_type = "notfound"
      error = "User not found"
    }
  
    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "User account is inactive"
    }
  
    // Check if user is super_admin (has access to all profiles)
    var $is_super_admin {
      value = ($bid.type == "super_admin")
    }
  
    // For non-super_admin users, check if they have assigned profiles
    var $profile_count {
      value = $bid.profile_ids|count
    }
  
    precondition ($is_super_admin || $profile_count > 0) {
      error_type = "notfound"
      error = "No profiles assigned to this bidder"
    }
  
    var $profile_names {
      value = []
    }
  
    var $resume_templates {
      value = []
    }
  
    var $final_profile_ids {
      value = []
    }
  
    // For super_admin, load ALL profiles; otherwise use assigned profile_ids
    conditional {
      if ($is_super_admin) {
        db.query profile {
          sort = {profile.created_at: "desc"}
          return = {type: "list"}
        } as $all_profiles
      
        foreach ($all_profiles) {
          each as $prof {
            var.update $final_profile_ids {
              value = $final_profile_ids|push:$prof.id
            }
          
            var.update $profile_names {
              value = $profile_names|push:$prof.full_name
            }
          
            var.update $resume_templates {
              value = $resume_templates|push:$prof.resume_template
            }
          }
        }
      }
    
      else {
        var.update $final_profile_ids {
          value = $bid.profile_ids
        }
      
        foreach ($bid.profile_ids) {
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
              
                var.update $resume_templates {
                  value = $resume_templates|push:$prof.resume_template
                }
              }
            }
          }
        }
      }
    }
  
    // Determine if user is admin based on user type
    var $is_admin {
      value = ($bid.type == "admin" || $bid.type == "super_admin")
    }
  }

  response = {
    profile_ids     : $final_profile_ids
    profile_names   : $profile_names
    resume_templates: $resume_templates
    is_admin        : $is_admin
  }
}