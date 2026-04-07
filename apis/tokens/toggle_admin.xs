// Toggle admin permission on a token
query "tokens/{id}/toggle-admin" verb=PATCH {
  api_group = "tokens"
  auth = "admin"

  input {
    uuid id?
    bool is_admin?
  }

  stack {
    precondition ($input.id != null) {
      error_type = "badrequest"
      error = "id is required"
    }
  
    precondition ($input.is_admin != null) {
      error_type = "badrequest"
      error = "is_admin is required"
    }
  
    db.get access_token {
      field_name = "id"
      field_value = $input.id
    } as $t
  
    precondition ($t != null) {
      error_type = "notfound"
      error = "Token not found"
    }
  
    db.patch access_token {
      field_name = "id"
      field_value = $t.id
      data = {is_admin: $input.is_admin}
    } as $updated
  }

  response = {success: true, is_admin: $input.is_admin}
}
