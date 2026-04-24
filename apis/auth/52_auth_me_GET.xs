// Get current authenticated user info
query "auth/me" verb=GET {
  api_group = "auth"
  auth = "users"

  input {
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user
  
    precondition ($user != null) {
      error_type = "notfound"
      error = "User not found"
    }
  }

  response = {
    id   : $user.id
    email: $user.email
    name : $user.full_name
    type : $user.type
  }
}