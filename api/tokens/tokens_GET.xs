// List all tokens with user names
// Super admins see all tokens
// Admins see only keys they can manage (own + own bidders', see tokens/can_manage_user_keys)
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
        // Included only when the caller may manage the key's owner (super_admin: all)
        var $should_include {
          value = false
        }

        var $is_assigned {
          value = false
        }

        var $can_manage {
          value = false
        }

        conditional {
          if ($t.user_id != null) {
            function.run "tokens/can_manage_user_keys" {
              input = {caller_id: $auth.id, target_user_id: $t.user_id}
            } as $scope

            var.update $can_manage {
              value = $scope.allowed
            }
          }
        }

        conditional {
          if ($can_manage || $auth_user.type == "super_admin") {
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
          
            var $allowed_ips_out {
              value = []
            }
          
            conditional {
              if ($t.allowed_ips != null) {
                var.update $allowed_ips_out {
                  value = $t.allowed_ips
                }
              }
            }
          
            array.push $out {
              value = {
                id                : $t.id
                token             : $t.token
                user_id           : $t.user_id
                user_name         : $user_name_val
                user_type         : $user_type
                issued_date       : $t.issued_at
                expiration_date   : $t.expires_at
                is_used           : $t.is_used
                is_active         : $t.is_active
                assigned_admin_ids: $t.assigned_admin_ids
                is_assigned       : $is_assigned
                allowed_ips       : $allowed_ips_out
                can_manage        : $can_manage
              }
            }
          }
        }
      }
    }
  }

  response = $out
  guid = "Pidd40FIl9MgBtQo7E3UNGlrucs"
}