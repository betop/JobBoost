// Super admin declines a key request
query "tokens/requests/{token_request_id}/decline" verb=PATCH {
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
  
    // Only super_admin can decline
    precondition ($auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super admins can decline requests"
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
  
    // Update the request status
    db.edit token_request {
      field_name = "id"
      field_value = $req.id
      enforce_hidden_fields = false
      data = {
        status      : "declined"
        reviewed_by : $auth_user.id
        reviewed_at : now
        review_notes: $input.review_notes
      }
    }
  }

  response = {
    id         : $req.id
    status     : "declined"
    reviewed_by: $auth_user.id
    reviewed_at: now
  }
}