// List all tokens with bidder names
query tokens verb=GET {
  api_group = "tokens"
  auth = "admin"

  input {
  }

  stack {
    db.query access_token {
      sort = {access_token.created_at: "desc"}
      return = {type: "list"}
    } as $tokens
  
    var $out {
      value = []
    }
  
    foreach ($tokens) {
      each as $t {
        var $bidder_name {
          value = null
        }
      
        conditional {
          if ($t.bidder_id != null) {
            db.get bidder {
              field_name = "id"
              field_value = $t.bidder_id
            } as $bid
          
            conditional {
              if ($bid != null) {
                var.update $bidder_name {
                  value = $bid.full_name
                }
              }
            }
          }
        }
      
        array.push $out {
          value = {
            id             : $t.id
            token          : $t.token
            bidder_id      : $t.bidder_id
            bidder_name    : $bidder_name
            issued_date    : $t.issued_at
            expiration_date: $t.expires_at
            is_used        : $t.is_used
            is_active      : $t.is_active
          }
        }
      }
    }
  }

  response = $out
}