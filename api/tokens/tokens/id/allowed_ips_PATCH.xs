// Replace the IP whitelist of a key. Empty list = no IP restriction.
query "tokens/{id}/allowed-ips" verb=PATCH {
  api_group = "tokens"
  auth = "users"

  input {
    uuid id?
    text[] allowed_ips
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $caller

    precondition ($caller != null && $caller.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super_admin can change a key's IP whitelist"
    }

    db.get access_token {
      field_name = "id"
      field_value = $input.id
    } as $t
  
    precondition ($t != null) {
      error_type = "notfound"
      error = "Token not found"
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
  
    db.patch access_token {
      field_name = "id"
      field_value = $t.id
      data = {allowed_ips: $norm.entries}
    } as $updated
  }

  response = {id: $t.id, allowed_ips: $norm.entries}
  guid = "Qqyky8IHOV95xUjiRALsCUjnSAk"
}
