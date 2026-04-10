// List all tokens with bidder names
query tokens verb=GET {
  api_group = "tokens"
  auth = "users"

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
      
        var $user_type {
          value = null
        }
      
        var $is_admin {
          value = false
        }
      
        conditional {
          if ($t.bidder_id != null) {
            db.get users {
              field_name = "id"
              field_value = $t.bidder_id
            } as $bid
          
            conditional {
              if ($bid != null) {
                var.update $bidder_name {
                  value = $bid.full_name
                }
              
                var.update $user_type {
                  value = $bid.type
                }
              
                // Check if user is admin or super_admin
                conditional {
                  if ($bid.type == "admin" || $bid.type == "super_admin") {
                    var.update $is_admin {
                      value = true
                    }
                  }
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
            user_type      : $user_type
            issued_date    : $t.issued_at
            expiration_date: $t.expires_at
            is_used        : $t.is_used
            is_active      : $t.is_active
            is_admin       : $is_admin
          }
        }
      }
    }
  }

  response = $out
}