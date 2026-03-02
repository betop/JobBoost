// TEMPORARY: Fix a specific expired token - DELETE THIS AFTER USE (v2)
query "public/temp-fix-token" verb=POST {
  api_group = "public"

  input {
    text token?
  }

  stack {
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing token"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $record
  
    precondition ($record != null) {
      error_type = "notfound"
      error = "Token not found"
    }
  
    // Set expiry to year 2099 (far future) and re-activate
    // Using a fixed far-future timestamp: 2099-12-31T23:59:59Z = 4102444799000 ms
    db.patch access_token {
      field_name = "id"
      field_value = $record.id
      data = {expires_at: 4102444799000, is_active: true}
    } as $patched
  }

  response = {
    success           : true
    record_id         : $record.id
    patched_expires_at: $patched.expires_at
  }
}