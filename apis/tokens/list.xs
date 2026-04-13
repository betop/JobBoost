// List all tokens with user names
// Super admins see all tokens, admins see only tokens where created_by_admin_id == their id
query tokens verb=GET {
  api_group = "tokens"
  auth = "users"

  input {
  }

  stack {
    // Get authenticated user to check role
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    db.query access_token {
      sort = {access_token.created_at: "desc"}
      return = {type: "list"}
    } as $tokens
  
    var $out {
      value = []
    }
  
    foreach ($tokens) {
      each as $t {
        // For admins, only show tokens they created
        var $should_include {
          value = false
        }
      
        conditional {
          if ($auth_user.type == "super_admin") {
            var.update $should_include {
              value = true
            }
          }
        }
      
        conditional {
          if ($auth_user.type == "admin" && $t.created_by_admin_id == $auth.id) {
            var.update $should_include {
              value = true
            }
          }
        }
      
        conditional {
          if ($should_include) {
            var $user_name_val {
              value = null
            }
          
            var $user_type {
              value = null
            }
          
            conditional {
              if ($t.user_id != null) {
                db.get users {
                  field_name = "id"
                  field_value = $t.user_id
                } as $bid
              
                conditional {
                  if ($bid != null) {
                    var.update $user_name_val {
                      value = $bid.full_name
                    }
                  
                    var.update $user_type {
                      value = $bid.type
                    }
                  }
                }
              }
            }
          
            array.push $out {
              value = {
                id             : $t.id
                token          : $t.token
                user_id        : $t.user_id
                user_name      : $user_name_val
                user_type      : $user_type
                issued_date    : $t.issued_at
                expiration_date: $t.expires_at
                is_used        : $t.is_used
                is_active      : $t.is_active
              }
            }
          }
        }
      }
    }
  }

  response = $out
}