// Admin registration — creates a new admin account, approved automatically (no super admin approval needed)
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
    db.query users {
      where = $db.users.email == $input.email && ($db.users.deleted == false || $db.users.deleted == null)
      return = {type: "single"}
    } as $existing
  
    precondition ($existing == null) {
      error_type = "badrequest"
      error = "An account with this email already exists"
    }
  
    // New admin accounts get the free trial generations
    function.run "credits/free_generation_allowance" {
      input = {}
    } as $free_allowance

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
        is_approved        : true
        updated_at         : now
        created_by         : $new_user_id
        assigned_bidder_ids: []
        free_generations_remaining: $free_allowance
      }
    } as $admin
  }

  response = {
    message: "Your account has been created. You can now sign in."
  }

  guid = "lC3n2mnzcP7i4ITC8NgP0Gy9wvM"
}