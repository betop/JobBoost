// Admin submits a key generation request
// Fixed: split compound precondition
query "tokens/request" verb=POST {
  api_group = "tokens"
  auth = "users"

  input {
    uuid user_id?
    timestamp expiration_date?
    text notes?
  }

  stack {
    // Get authenticated user
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Only admins can submit requests (super_admins generate directly)
    precondition ($auth_user.type == "admin") {
      error_type = "accessdenied"
      error = "Only admins can submit key requests"
    }
  
    precondition ($input.user_id != null) {
      error_type = "badrequest"
      error = "user_id is required"
    }
  
    // Verify the bidder exists and is active
    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $bidder
  
    precondition ($bidder != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    precondition ($bidder.is_active) {
      error_type = "accessdenied"
      error = "Bidder is inactive"
    }
  
    // Normalize expiration_date: treat empty string as null
    var $exp_date {
      value = null
    }
  
    conditional {
      if ($input.expiration_date != null && $input.expiration_date != "") {
        var.update $exp_date {
          value = $input.expiration_date
        }
      }
    }
  
    // Normalize admin_notes: treat empty/null as empty string
    var $admin_notes {
      value = ""
    }
  
    conditional {
      if ($input.notes != null && $input.notes != "") {
        var.update $admin_notes {
          value = $input.notes
        }
      }
    }
  
    // Create the request — must set ALL fields to avoid empty string uuid errors
    // Xano db.add inserts all table columns; unset uuid fields get "" which is invalid
    // Use placeholder values for reviewed_by/generated_token_id (will be overwritten on approve/decline)
    db.add token_request {
      data = {
        created_at        : now
        requested_by      : $auth_user.id
        user_id           : $input.user_id
        expiration_date   : $exp_date
        status            : "pending"
        admin_notes       : $admin_notes
        reviewed_by       : $auth_user.id
        reviewed_at       : now
        review_notes      : ""
        generated_token_id: $input.user_id
      }
    } as $req
  }

  response = {
    id             : $req.id
    requested_by   : $req.requested_by
    user_id        : $req.user_id
    user_name      : $bidder.full_name
    expiration_date: $req.expiration_date
    status         : $req.status
    admin_notes    : $req.admin_notes
    created_at     : $req.created_at
  }
}