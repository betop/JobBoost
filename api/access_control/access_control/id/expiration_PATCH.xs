// Update expiration date on an access token
query "access-control/{id}/expiration" verb=PATCH {
  api_group = "access-control"
  auth = "users"

  input {
    uuid id?
    timestamp expiration_date?
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
      data = {expires_at: $input.expiration_date}
    }
  }

  response = {success: true}
  guid = "Qkz__kIxPbsWoymcivGRLoQwBbU"
}