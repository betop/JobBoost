// Extend or clear the expiration date on a token
query "tokens/{id}/extend" verb=PATCH {
  api_group = "tokens"
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
      error = "Token not found"
    }
  
    // Also re-activate in case the token was still marked active but expired
    db.patch access_token {
      field_name = "id"
      field_value = $t.id
      data = {expires_at: $input.expiration_date, is_active: true}
    }
  }

  response = {success: true}
}