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
  
    // Batch-load billing admin names (single query, avoids N+1)
    var $admin_names {
      value = {}
    }
  
    var $admin_ids {
      value = []
    }
  
    foreach ($profiles) {
      each as $bp {
        conditional {
          if ($bp.billing_admin_id != null) {
            array.push $admin_ids {
              value = $bp.billing_admin_id
            }
          }
        }
      }
    }
  
    conditional {
      if (($admin_ids|count) > 0) {
        db.query users {
          where = $db.users.id in $admin_ids
          return = {type: "list"}
        } as $billing_admins
      
        foreach ($billing_admins) {
          each as $ba {
            var.update $admin_names {
              value = $admin_names|set:($ba.id|to_text):$ba.full_name
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
            use_legacy_api        : $p.use_legacy_api
            block_lead_roles      : $p.block_lead_roles
            tailor_job_title      : $p.tailor_job_title
            allowed_languages     : $p.allowed_languages
            default_compensation  : $p.default_compensation
            billing_admin_id      : $p.billing_admin_id
            billing_admin_name    : $p.billing_admin_id != null ? ($admin_names|get:($p.billing_admin_id|to_text)) : null
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