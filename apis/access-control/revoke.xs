// Revoke access (set is_active = false on the token)
query "access-control/{id}/revoke" verb=PATCH {
  api_group = "access-control"
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
      error = "Access control record not found"
    }
  
    db.patch access_token {
      field_name = "id"
      field_value = $t.id
      data = {is_active: false}
    }
  }

  response = {success: true}
}