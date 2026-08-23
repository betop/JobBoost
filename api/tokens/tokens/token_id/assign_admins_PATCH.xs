// Assign admins to a token (super_admin only)
// Admins can view assigned tokens but cannot modify them
query "tokens/{token_id}/assign-admins" verb=PATCH {
  api_group = "tokens"
  auth = "users"

  input {
    uuid token_id
    uuid[] admin_ids?
  }

  stack {
    // Get authenticated user
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Only super_admin can assign tokens to admins
    precondition ($auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super admins can assign tokens to admins"
    }
  
    // Get the token
    db.get access_token {
      field_name = "id"
      field_value = $input.token_id
    } as $token
  
    precondition ($token != null) {
      error_type = "notfound"
      error = "Token not found"
    }
  
    // Validate all admin_ids are valid admins (not bidders)
    var $validated_ids {
      value = []
    }
  
    conditional {
      if ($input.admin_ids != null) {
        foreach ($input.admin_ids) {
          each as $admin_id {
            db.get users {
              field_name = "id"
              field_value = $admin_id
            } as $admin
          
            conditional {
              if ($admin != null && ($admin.type == "admin" || $admin.type == "super_admin")) {
                array.push $validated_ids {
                  value = $admin_id
                }
              }
            }
          }
        }
      }
    }
  
    // Update token with assigned admin IDs
    db.edit access_token {
      field_name = "id"
      field_value = $input.token_id
      enforce_hidden_fields = false
      data = {assigned_admin_ids: $validated_ids}
    } as $updated_token
  }

  response = {
    id                : $updated_token.id
    assigned_admin_ids: $updated_token.assigned_admin_ids
    message           : "Token assignments updated successfully"
  }

  guid = "CAUNHfk0dLXYeV-vJ6k2kRTtdTg"
}