// Single source of truth for issuing an access key (used by tokens/request POST and tokens/requests/{id}/approve PATCH).
// Generates a raw uuid token, stores its sha256 hash, and returns the created access_token row plus the raw token.
// Every uuid column is set explicitly (null-uuid lesson). Callers must validate the bidder before calling.
function "tokens/issue_access_token" {
  description = "Create an active access_token row for a bidder (raw uuid token + sha256 hash)"

  input {
    uuid user_id
    uuid created_by_admin_id
    timestamp expires_at?
  }

  stack {
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
        user_id            : $input.user_id
        created_by_admin_id: $input.created_by_admin_id
        issued_at          : now
        expires_at         : $input.expires_at
        is_used            : false
        is_active          : true
      }
    } as $token

    var $result {
      value = {token_id: $token.id, token: $raw_token, token_hash: $token_hash}
    }
  }

  response = $result

  guid = "Ti7sSueAcc3ssTokenFnQ2wXz8Lk"
}
