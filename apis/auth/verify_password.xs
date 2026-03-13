// Verify admin password without creating a new token
query "auth/verify-password" verb=POST {
  api_group = "auth"
  auth = "admin"

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
  }

  response = {verified: true, email: $admin.email}
}