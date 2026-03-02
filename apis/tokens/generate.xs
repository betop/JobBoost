// Generate a new token for a bidder
query "tokens/generate" verb=POST {
  api_group = "tokens"
  auth = "admin"

  input {
    uuid bidder_id?
    timestamp expiration_date?
  }

  stack {
    precondition ($input.bidder_id != null) {
      error_type = "badrequest"
      error = "bidder_id is required"
    }
  
    db.get bidder {
      field_name = "id"
      field_value = $input.bidder_id
    } as $bid
  
    precondition ($bid != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "Bidder is inactive"
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
        bidder_id          : $input.bidder_id
        created_by_admin_id: $auth.id
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
    bidder_id      : $t.bidder_id
    bidder_name    : $bid.full_name
    issued_date    : $t.issued_at
    expiration_date: $t.expires_at
    is_used        : $t.is_used
    is_active      : $t.is_active
  }
}