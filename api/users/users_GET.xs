// List all users — returns profile_ids and profile_names arrays
// super_admins: optional ?type= filter, see all users
// admins: always see only bidders they created or that are assigned to them
query users verb=GET {
  api_group = "users"
  auth = "users"

  input {
    text type?
    bool include_deleted?
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
        var $super_admin_query {
          value = "SELECT * FROM x1_2 WHERE 1 = 1"
        }
      
        conditional {
          if ($input.include_deleted != true) {
            var.update $super_admin_query {
              value = $super_admin_query ~ " AND deleted IS NOT TRUE"
            }
          }
        }
      
        conditional {
          if ($input.type != null && $input.type != "") {
            var.update $super_admin_query {
              value = $super_admin_query ~ " AND type = '" ~ ($input.type|replace:"'":"") ~ "'"
            }
          }
        }
      
        var.update $super_admin_query {
          value = $super_admin_query ~ " ORDER BY created_at DESC"
        }
      
        db.direct_query {
          sql = "{{ $super_admin_query }};"
          parser = "template_engine"
          response_type = "list"
        } as $users
      }
    
      else {
        var $users_query {
          value = "SELECT * FROM x1_2 WHERE 1 = 1"
        }
      
        conditional {
          if ($input.include_deleted != true) {
            var.update $users_query {
              value = $users_query ~ " AND deleted IS NOT TRUE"
            }
          }
        }
      
        // Scope: self + bidders created by or assigned to this admin
        var $self_id {
          value = $auth_user.id|to_text|replace:"'":""
        }
      
        var $scope_bidders {
          value = "(type = 'bidder' AND (created_by = '" ~ $self_id ~ "'"
        }
      
        conditional {
          if ($auth_user.assigned_bidder_ids != null && ($auth_user.assigned_bidder_ids|count) > 0) {
            var $assigned_ids_clean {
              value = ($auth_user.assigned_bidder_ids|map:($$|to_text|replace:"'":"")|join:"','")
            }
          
            var.update $scope_bidders {
              value = $scope_bidders ~ " OR id IN ('" ~ $assigned_ids_clean ~ "')"
            }
          }
        }
      
        var.update $scope_bidders {
          value = $scope_bidders ~ "))"
        }
      
        var $admin_type {
          value = ($input.type != null ? $input.type : "")
        }
      
        conditional {
          if ($admin_type == "bidder") {
            var.update $users_query {
              value = $users_query ~ " AND " ~ $scope_bidders
            }
          }
        
          elseif ($admin_type == "admin") {
            var.update $users_query {
              value = $users_query ~ " AND id = '" ~ $self_id ~ "'"
            }
          }
        
          elseif ($admin_type == "") {
            var.update $users_query {
              value = $users_query ~ " AND (id = '" ~ $self_id ~ "' OR " ~ $scope_bidders ~ ")"
            }
          }
        
          else {
            // Any other type: nothing visible to admins
            var.update $users_query {
              value = $users_query ~ " AND 1 = 0"
            }
          }
        }
      
        var.update $users_query {
          value = $users_query ~ " ORDER BY created_at DESC"
        }
      
        db.direct_query {
          sql = "{{ $users_query }};"
          parser = "template_engine"
          response_type = "list"
        } as $users
      }
    }
  }

  response = $users
  guid = "Q4l_y1J1NECO-PdHrPWGf-5UcU4"
}