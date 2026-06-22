// Super admin approves a key request — generates a real access token
query "tokens/requests/{token_request_id}/approve" verb=PATCH {
  api_group = "tokens"
  auth = "users"

  input {
    uuid token_request_id?
    text review_notes?
  }

  stack {
    // Get authenticated user
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Only super_admin can approve
    precondition ($auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super admins can approve requests"
    }
  
    // Get the request
    db.get token_request {
      field_name = "id"
      field_value = $input.token_request_id
    } as $req
  
    precondition ($req != null) {
      error_type = "notfound"
      error = "Request not found"
    }
  
    precondition ($req.status == "pending") {
      error_type = "badrequest"
      error = "Request is not in pending status"
    }
  
    // Verify bidder is still valid
    db.get users {
      field_name = "id"
      field_value = $req.user_id
    } as $bidder
  
    precondition ($bidder != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    precondition ($bidder.is_active) {
      error_type = "accessdenied"
      error = "Bidder is inactive"
    }
  
    // Generate a real token
    security.create_uuid as $raw_token
  
    var $token_hash {
      value = $raw_token|sha256
    }
  
    db.add access_token {
      enforce_hidden_fields = false
      data = {
        created_at         : now
        token              : $raw_token
        token_hash         : $token_hash
        user_id            : $req.user_id
        created_by_admin_id: $req.requested_by
        issued_at          : now
        expires_at         : $req.expiration_date
        is_used            : false
        is_active          : true
      }
    } as $token
  
    // Update the request status
    db.edit token_request {
      field_name = "id"
      field_value = $req.id
      enforce_hidden_fields = false
      data = {
        status            : "approved"
        reviewed_by       : $auth_user.id
        reviewed_at       : now
        review_notes      : $input.review_notes
        generated_token_id: $token.id
      }
    }
  }

  response = {
    id         : $req.id
    status     : "approved"
    token      : $raw_token
    token_id   : $token.id
    user_name  : $bidder.full_name
    reviewed_by: $auth_user.id
    reviewed_at: now
  }
}