// One-time recovery: populate user_id on ALL generation_log records
// Updates ALL logs by matching profile_id to users.profile_ids
// Equivalent to: UPDATE generation_log SET user_id = users.id FROM users WHERE users.profile_ids includes generation_log.profile_id
query "logs/recover-user-ids" verb=POST {
  api_group = "logs"
  auth = "users"

  input {
  }

  stack {
    // Only super_admin can run recovery
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    precondition ($auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super admins can run recovery"
    }
  
    // Get all users to build profile_id → user_id lookup
    db.query users {
      return = {type: "list"}
    } as $all_users
  
    // Build a flat list of {profile_id, user_id} pairs from users.profile_ids
    var $profile_to_user {
      value = []
    }
  
    foreach ($all_users) {
      each as $u {
        conditional {
          if ($u.profile_ids != null) {
            foreach ($u.profile_ids) {
              each as $pid {
                array.push $profile_to_user {
                  value = {profile_id: $pid, user_id: $u.id}
                }
              }
            }
          }
        }
      }
    }
  
    // Get ALL generation_log records
    db.query generation_log {
      return = {type: "list"}
    } as $all_logs
  
    var $updated_count {
      value = 0
    }
  
    var $skipped_count {
      value = 0
    }
  
    foreach ($all_logs) {
      each as $log {
        // Find matching user_id for this log's profile_id
        var $found_user_id {
          value = null
        }
      
        foreach ($profile_to_user) {
          each as $mapping {
            conditional {
              if ($mapping.profile_id == $log.profile_id) {
                var.update $found_user_id {
                  value = $mapping.user_id
                }
              }
            }
          }
        }
      
        conditional {
          if ($found_user_id != null) {
            db.edit generation_log {
              field_name = "id"
              field_value = $log.id
              enforce_hidden_fields = false
              data = {user_id: $found_user_id}
            } as $updated_log
          
            var.update $updated_count {
              value = $updated_count + 1
            }
          }
        
          else {
            var.update $skipped_count {
              value = $skipped_count + 1
            }
          }
        }
      }
    }
  }

  response = {
    success      : true
    total_logs   : $all_logs|count
    updated_count: $updated_count
    skipped_count: $skipped_count
  }
}