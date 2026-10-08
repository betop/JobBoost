// Admin requests a key: the key is issued IMMEDIATELY (no super-admin review needed).
// The request row is stored as "approved" (auto-approved by the requesting admin) for audit/history.
// Old pending requests are still handled by requests/{id}/approve and /decline.
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
  
    precondition ($bidder.deleted != true) {
      error_type = "notfound"
      error = "Bidder not found"
    }

    precondition ($bidder.is_active) {
      error_type = "accessdenied"
      error = "Bidder is inactive"
    }

    // Shared scope rule: admin may issue keys for self and own bidders only
    function.run "tokens/can_manage_user_keys" {
      input = {caller_id: $auth_user.id, target_user_id: $input.user_id}
    } as $scope

    precondition ($scope.allowed) {
      error_type = "accessdenied"
      error = "You can only manage keys for yourself and your own bidders"
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
  
    // Issue the key right away (shared logic with approve)
    function.run "tokens/issue_access_token" {
      input = {
        user_id            : $input.user_id
        created_by_admin_id: $auth_user.id
        expires_at         : $exp_date
      }
    } as $issued

    // Store the request as auto-approved — ALL uuid fields set explicitly
    db.add token_request {
      enforce_hidden_fields = false
      data = {
        created_at        : now
        requested_by      : $auth_user.id
        user_id           : $input.user_id
        expiration_date   : $exp_date
        status            : "approved"
        admin_notes       : $admin_notes
        reviewed_by       : $auth_user.id
        reviewed_at       : now
        review_notes      : "Auto-approved"
        generated_token_id: $issued.token_id
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
    reviewed_by    : $req.reviewed_by
    reviewed_at    : $req.reviewed_at
    review_notes   : $req.review_notes
    token_id       : $issued.token_id
    token          : $issued.token
  }

  guid = "KB-QCWZqXC_CGnRqU56m7jt0Voc"
}