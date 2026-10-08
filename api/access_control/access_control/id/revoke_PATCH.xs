// Revoke access (set is_active = false on the token)
query "access-control/{id}/revoke" verb=PATCH {
  api_group = "access-control"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get access_token {
      field_name = "id"
      field_value = $input.id
    } as $t
  
    precondition ($t != null) {
      error_type = "notfound"
      error = "Access control record not found"
    }

    function.run "tokens/can_manage_user_keys" {
      input = {caller_id: $auth.id, target_user_id: $t.user_id}
    } as $scope

    precondition ($t.user_id != null && $scope.allowed) {
      error_type = "accessdenied"
      error = "You can only manage keys for yourself and your own bidders"
    }
  
    db.patch access_token {
      field_name = "id"
      field_value = $t.id
      data = {is_active: false}
    }
  }

  response = {success: true}
  guid = "UqVA9PdXPEwXWEn_uCHlaygd28Y"
}