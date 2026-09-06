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
        var $super_admin_query {
          value = "SELECT * FROM x1_2"
        }
      
        conditional {
          if ($input.type != null && $input.type != "") {
            var.update $super_admin_query {
              value = $super_admin_query ~ " WHERE type = '" ~ ($input.type|replace:"'":"") ~ "'"
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
          value = "SELECT * FROM x1_2"
        }
      
        conditional {
          if ($auth_user.assigned_bidder_ids != null && ($auth_user.assigned_bidder_ids|count) > 0) {
            var $assigned_ids_string {
              value = $auth_user.assigned_bidder_ids|join:"', '"
            }
          
            var.update $users_query {
              value = $users_query ~ " WHERE id IN ('" ~ $assigned_ids_string ~ "')"
            }
          }
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