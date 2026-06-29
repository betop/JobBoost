// Admin login (users table)
// Token expiration: max int (effectively unlimited — ~68 years)
query "auth/login" verb=POST {
  api_group = "auth"

  input {
    email email? filters=trim|lower
    text password?
  }

  stack {
    db.get users {
      field_name = "email"
      field_value = $input.email
    } as $user
  
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    // Admin users require approval from super_admin before they can login
    // super_admin users bypass this check
    precondition ($user.type == "super_admin" || $user.is_approved) {
      error_type = "accessdenied"
      error = "Your account is pending approval"
    }
  
    security.check_password {
      text_password = $input.password
      hash_password = $user.password_hash
    } as $pass_ok
  
    precondition ($pass_ok) {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    security.create_auth_token {
      table = "users"
      extras = {}
      expiration = 2147483647
      id = $user.id
    } as $authToken
  }

  response = {
    token: $authToken
    admin: ```
      {
        id: $user.id
        email: $user.email
        name: $user.full_name
        type: $user.type
      }
      ```
  }
}