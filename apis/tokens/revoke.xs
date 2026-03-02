// Revoke a token
query "tokens/{id}/revoke" verb=PATCH {
  api_group = "tokens"
  auth = "admin"

  input {
    uuid id?
  }

  stack {
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
      data = {is_active: false}
    }
  }

  response = {success: true}
}