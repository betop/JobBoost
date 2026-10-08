// Variant of tokens/can_manage_user_keys for an existing access_token row (target = key.user_id).
// Returns {found, allowed, user_id}. Missing key -> found=false, allowed=false.
function "tokens/can_manage_key" {
  description = "Scope rule applied to an access_token row"

  input {
    uuid caller_id
    uuid token_id
  }

  stack {
    var $result {
      value = {found: false, allowed: false, user_id: null}
    }

    db.get access_token {
      field_name = "id"
      field_value = $input.token_id
    } as $key

    conditional {
      if ($key != null && $key.user_id != null) {
        function.run "tokens/can_manage_user_keys" {
          input = {caller_id: $input.caller_id, target_user_id: $key.user_id}
        } as $scope

        var.update $result {
          value = {found: true, allowed: $scope.allowed, user_id: $key.user_id}
        }
      }
      elseif ($key != null) {
        var.update $result {
          value = {found: true, allowed: false, user_id: null}
        }
      }
    }
  }

  response = $result

  guid = "Ck4CanManageKeyFnR2yUw8Pe"
}
