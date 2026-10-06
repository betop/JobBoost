// Admin login (users table)
// Token expiration: max int (effectively unlimited — ~68 years)
query "auth/login" verb=POST {
  api_group = "auth"

  input {
    email email? filters=trim|lower
    text password?
  }

  stack {
    // Soft-deleted users are ignored (their email may be reused by a new account)
    db.query users {
      where = $db.users.email == $input.email && ($db.users.deleted == false || $db.users.deleted == null)
      return = {type: "single"}
    } as $user
  
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Invalid email or password"
    }
  
    // Sign-ups are approved automatically, so login no longer waits for super admin approval.
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

  guid = "Z22JRJtkF4M_64sRy9XdWqUDtDQ"
}