// Deactivate a user — sets is_active to false (PATCH /users/:id/deactivate)
query "users/{id}/deactivate" verb=PATCH {
  api_group = "users"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.id
    } as $user
  
    precondition ($user != null) {
      error_type = "notfound"
      error = "User not found"
    }
  
    db.patch users {
      field_name = "id"
      field_value = $user.id
      data = {is_active: false, updated_at: now}
    } as $updated
  }

  response = {success: true}
}