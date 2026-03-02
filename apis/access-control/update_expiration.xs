// Update expiration date on an access token
query "access-control/{id}/expiration" verb=PATCH {
  api_group = "access-control"
  auth = "admin"

  input {
    uuid id?
    timestamp expiration_date?
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
      data = {expires_at: $input.expiration_date}
    }
  }

  response = {success: true}
}