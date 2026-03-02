// Admin registration (one-time setup — blocked if any admin already exists)
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
  
    // Block registration if any admin already exists
    db.query admin {
      return = {type: "count"}
    } as $admin_count
  
    precondition ($admin_count == 0) {
      error_type = "accessdenied"
      error = "Registration is disabled. An admin account already exists."
    }
  
    // Check email not already taken
    db.get admin {
      field_name = "email"
      field_value = $input.email
    } as $existing
  
    precondition ($existing == null) {
      error_type = "badrequest"
      error = "An account with this email already exists"
    }
  
    db.add admin {
      data = {
        created_at   : now
        name         : $input.name
        email        : $input.email
        password_hash: $input.password
        updated_at   : now
      }
    } as $admin
  
    security.create_auth_token {
      table = "admin"
      extras = {}
      expiration = 86400
      id = $admin.id
    } as $authToken
  }

  response = {
    token: $authToken
    admin: ```
      {
        id   : $admin.id
        email: $admin.email
        name : $admin.name
      }
      ```
  }
}