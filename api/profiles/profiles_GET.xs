// List profiles — admins see only profiles they created or are assigned to them
// super_admins see all profiles
query profiles verb=GET {
  api_group = "profiles"
  auth = "users"

  input {
  }

  stack {
    // Get the authenticated user to check their type and profile_ids
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Fetch all profiles (excluding hidden ones)
    db.query profile {
      where = $db.profile.hide != true
      sort = {profile.created_at: "desc"}
      return = {type: "list"}
    } as $all_profiles
  
    var $profiles {
      value = []
    }
  
    conditional {
      if ($auth_user.type == "super_admin") {
        // Super admins see all profiles
        var.update $profiles {
          value = $all_profiles
        }
      }
    
      else {
        // Admins see only profiles they created or assigned to them
        foreach ($all_profiles) {
          each as $p {
            var $is_created_by {
              value = false
            }
          
            conditional {
              if ($p.created_by == $auth.id) {
                var.update $is_created_by {
                  value = true
                }
              }
            }
          
            var $is_assigned {
              value = false
            }
          
            conditional {
              if ($auth_user.profile_ids != null) {
                foreach ($auth_user.profile_ids) {
                  each as $pid {
                    conditional {
                      if ($pid == $p.id) {
                        var.update $is_assigned {
                          value = true
                        }
                      }
                    }
                  }
                }
              }
            }
          
            conditional {
              if ($is_created_by) {
                array.push $profiles {
                  value = $p
                }
              }
            
              elseif ($is_assigned) {
                array.push $profiles {
                  value = $p
                }
              }
            }
          }
        }
      }
    }
  
    // Map to response format
    var $out {
      value = []
    }
  
    foreach ($profiles) {
      each as $p {
        var $mapped {
          value = {
            id                    : $p.id
            full_name             : $p.full_name
            email                 : $p.email
            phone                 : $p.phone_number
            location              : $p.location
            linkedin              : $p.linkedin_url
            github                : $p.github_url
            job_category          : $p.job_category
            resume_template       : $p.resume_template
            created_at            : $p.created_at
            is_approved           : $p.is_approved
            include_key_projects  : $p.include_key_projects
            include_certifications: $p.include_certifications
            include_achievements  : $p.include_achievements
            education             : []
            work_experience       : []
          }
        }
      
        array.push $out {
          value = $mapped
        }
      }
    }
  }

  response = $out
  guid = "lecFnaaw0ujXZlWAqqEh3QiCmTw"
}