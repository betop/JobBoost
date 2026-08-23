// Validate bearer token for Chrome extension - returns profile_ids array
query "public/validate-token" verb=POST {
  api_group = "public"

  input {
    text token?
  }

  stack {
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing token"
    }
  
    // Look up token directly by value
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
  
    // Get the user
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
  
    // For non-super_admin users, check if they have assigned or created profiles
    var $profile_count {
      value = $bid.profile_ids|count
    }
  
    // Also count profiles created by this user
    db.query profile {
      where = $db.profile.created_by == $bid.id
      return = {type: "count"}
    } as $created_count
  
    precondition ($is_super_admin || $profile_count > 0 || $created_count > 0) {
      error_type = "notfound"
      error = "No profiles assigned to this bidder"
    }
  
    // Resolve profile names and resume templates
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
            conditional {
              if ($prof.is_approved) {
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
        }
      }
    
      else {
        // Start with explicitly assigned profile_ids
        var $assigned_ids {
          value = $bid.profile_ids
        }
      
        // Also find profiles created by this user
        db.query profile {
          where = $db.profile.created_by == $bid.id
          return = {type: "list"}
        } as $created_profiles
      
        // Merge created profile IDs into the assigned list (avoid duplicates)
        foreach ($created_profiles) {
          each as $cp {
            conditional {
              if ($cp.is_approved) {
                var $already_included {
                  value = false
                }
              
                foreach ($assigned_ids) {
                  each as $aid {
                    conditional {
                      if ($aid == $cp.id) {
                        var.update $already_included {
                          value = true
                        }
                      }
                    }
                  }
                }
              
                conditional {
                  if (!$already_included) {
                    var.update $assigned_ids {
                      value = $assigned_ids|push:$cp.id
                    }
                  }
                }
              }
            }
          }
        }
      
        foreach ($assigned_ids) {
          each as $pid {
            db.get profile {
              field_name = "id"
              field_value = $pid
            } as $prof
          
            conditional {
              if ($prof != null && $prof.is_approved) {
                var.update $final_profile_ids {
                  value = $final_profile_ids|push:$pid
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
        }
      }
    }
  
    precondition (($final_profile_ids|count) > 0) {
      error_type = "accessdenied"
      error = "No approved profiles assigned to this token"
    }
  
    // Mark token as used
    db.patch access_token {
      field_name = "id"
      field_value = $access.id
      data = {is_used: true}
    } as $updated_access
  
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

  guid = "IPIYhqhyW0CccsFqC4SmK44J-S4"
}