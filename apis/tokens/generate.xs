// Generate a new token for a user
query "tokens/generate" verb=POST {
  api_group = "tokens"
  auth = "users"

  input {
    uuid user_id?
    timestamp expiration_date?
  }

  stack {
    precondition ($input.user_id != null) {
      error_type = "badrequest"
      error = "user_id is required"
    }
  
    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $bid
  
    precondition ($bid != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "User is inactive"
    }
  
    // Check if user already has an active key
    db.query access_token {
      where = ($db.access_token.user_id == $input.user_id && $db.access_token.is_active == true) == true
      return = {type: "list"}
    } as $existing_keys
  
    var $existing_count {
      value = $existing_keys|count
    }
  
    precondition ($existing_count == 0) {
      error_type = "badrequest"
      error = "This user already has an active key. Revoke or delete the existing key first."
    }
  
    // Generate a random token string
    security.create_uuid as $raw_token
  
    // Hash the token for secure storage
    var $token_hash {
      value = $raw_token|sha256
    }
  
    db.add access_token {
      data = {
        created_at         : now
        token              : $raw_token
        token_hash         : $token_hash
        user_id            : $input.user_id
        created_by_admin_id: $auth.id
        assigned_admin_ids : []
        issued_at          : now
        expires_at         : $input.expiration_date
        is_used            : false
        is_active          : true
      }
    } as $t
  }

  response = {
    id             : $t.id
    token          : $t.token
    user_id        : $t.user_id
    user_name      : $bid.full_name
    user_type      : $bid.type
    issued_date    : $t.issued_at
    expiration_date: $t.expires_at
    is_used        : $t.is_used
    is_active      : $t.is_active
  }
}