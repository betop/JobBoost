// Generate a new token for a user
query "tokens/generate" verb=POST {
  api_group = "tokens"
  auth = "users"

  input {
    uuid user_id?
    timestamp expiration_date?
    text[] allowed_ips?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $caller

    var $ips_requested {
      value = $input.allowed_ips != null && ($input.allowed_ips|count) > 0
    }

    precondition (!$ips_requested || ($caller != null && $caller.type == "super_admin")) {
      error_type = "accessdenied"
      error = "Only super_admin can change a key's IP whitelist"
    }

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
  
    function.run "tokens/can_manage_user_keys" {
      input = {caller_id: $auth.id, target_user_id: $input.user_id}
    } as $scope

    precondition ($scope.allowed) {
      error_type = "accessdenied"
      error = "You can only manage keys for yourself and your own bidders"
    }

    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "User is inactive"
    }
  
    function.run "security/normalize_ip_list" {
      input = {ips: $input.allowed_ips}
    } as $norm
  
    precondition (!$norm.too_many) {
      error_type = "badrequest"
      error = "A key can have at most 50 allowed IP addresses"
    }
  
    precondition ($norm.invalid_entry == null) {
      error_type = "badrequest"
      error = "Invalid IP address: " ~ $norm.invalid_entry ~ ". Use a plain IPv4 or IPv6 address (CIDR ranges are not supported)."
    }
  
    // Check if user already has an active key
    db.query access_token {
      where = ($db.access_token.user_id == $input.user_id && $db.access_token.is_active) == true
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
      enforce_hidden_fields = false
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
        allowed_ips        : $norm.entries
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
    allowed_ips    : $norm.entries
  }

  guid = "w7VfZBOhhYRoqm5u-Yn1Zg3wyEE"
}