// Admin login
query "auth/login" verb=POST {
  api_group = "auth"

  input {
    email email? filters=trim|lower
    text password?
  }

  stack {
    db.get admin {
      field_name = "email"
      field_value = $input.email
    } as $admin
  
    precondition ($admin != null) {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    security.check_password {
      text_password = $input.password
      hash_password = $admin.password_hash
    } as $pass_ok
  
    precondition ($pass_ok) {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
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
        id: $admin.id
        email: $admin.email
        name: $admin.name
      }
      ```
  }
}