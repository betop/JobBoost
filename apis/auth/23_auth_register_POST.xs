// Admin registration — creates a new admin account pending super admin approval
query "auth/register" verb=POST {
  api_group = "auth"

  input {
    text name?
    email email? filters=trim|lower
    text password?
  }

  stack {
    precondition ($input.name != null) {
      error_type = "badrequest"
      error = "name is required"
    }
  
    precondition ($input.email != null) {
      error_type = "badrequest"
      error = "email is required"
    }
  
    precondition ($input.password != null) {
      error_type = "badrequest"
      error = "password is required"
    }
  
    // Check email not already taken
    db.get users {
      field_name = "email"
      field_value = $input.email
    } as $existing
  
    precondition ($existing == null) {
      error_type = "badrequest"
      error = "An account with this email already exists"
    }
  
    // Generate UUID for the new user first
    security.create_uuid as $new_user_id
  
    db.add users {
      enforce_hidden_fields = false
      data = {
        id                 : $new_user_id
        created_at         : now
        full_name          : $input.name
        email              : $input.email
        password_hash      : $input.password
        type               : "admin"
        profile_ids        : []
        is_active          : true
        is_approved        : false
        updated_at         : now
        created_by         : $new_user_id
        assigned_bidder_ids: []
      }
    } as $admin
  }

  response = {
    message: "Your account has been created and is pending approval from a super admin."
  }
}