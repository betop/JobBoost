// Approve or revoke a profile — super_admin only
query "profiles/{id}/approve" verb=PATCH {
  api_group = "profiles"
  auth = "users"

  input {
    uuid id?
    bool is_approved?
  }

  stack {
    // Only super_admin can approve profiles
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    precondition ($auth_user.type == "super_admin") {
      error_type = "unauthorized"
      error = "Only super admins can approve profiles"
    }
  
    db.get profile {
      field_name = "id"
      field_value = $input.id
    } as $p
  
    precondition ($p != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    var $payload {
      value = {updated_at: now}
    }
  
    // Use json_encode to detect false booleans (same pattern as users PUT)
    var $is_approved_changed {
      value = $input.is_approved|json_encode
    }
  
    conditional {
      if ($is_approved_changed != "") {
        var.update $payload.is_approved {
          value = $input.is_approved
        }
      }
    }
  
    db.patch profile {
      field_name = "id"
      field_value = $input.id
      data = $payload
    } as $updated
  }

  response = $updated
}