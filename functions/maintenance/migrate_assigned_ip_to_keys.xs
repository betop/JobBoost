// One-off migration: copies users.assigned_ip into access_token.allowed_ips.
// For every user with a non-empty assigned_ip, every key of that user whose allowed_ips is empty/null
// gets allowed_ips = [normalized assigned_ip]. Keys that already have a whitelist are left untouched.
// Idempotent. Pass dry_run=true to only report what would change.
function "maintenance/migrate_assigned_ip_to_keys" {
  description = "One-off: move users.assigned_ip to access_token.allowed_ips"

  input {
    bool dry_run?
  }

  stack {
    db.query users {
      return = {type: "list"}
    } as $all_users
  
    var $affected_users {
      value = []
    }
  
    var $users_with_ip {
      value = 0
    }
  
    var $keys_updated {
      value = 0
    }
  
    var $keys_skipped {
      value = 0
    }
  
    foreach ($all_users) {
      each as $u {
        var $ip {
          value = ((($u.assigned_ip|to_text)|trim)|replace:"::ffff:":"")|to_lower
        }
      
        conditional {
          if ($u.assigned_ip != null && $ip != "") {
            math.add $users_with_ip {
              value = 1
            }
          
            db.query access_token {
              where = $db.access_token.user_id == $u.id
              return = {type: "list"}
            } as $keys
          
            var $user_keys_updated {
              value = 0
            }
          
            foreach ($keys) {
              each as $k {
                var $existing {
                  value = []
                }
              
                conditional {
                  if ($k.allowed_ips != null) {
                    var.update $existing {
                      value = $k.allowed_ips|filter:(($$|trim) != "")
                    }
                  }
                }
              
                conditional {
                  if (($existing|count) == 0) {
                    conditional {
                      if (!$input.dry_run) {
                        db.patch access_token {
                          field_name = "id"
                          field_value = $k.id
                          data = {allowed_ips: [$ip]}
                        }
                      }
                    }
                  
                    math.add $keys_updated {
                      value = 1
                    }
                  
                    math.add $user_keys_updated {
                      value = 1
                    }
                  }
                  else {
                    math.add $keys_skipped {
                      value = 1
                    }
                  }
                }
              }
            }
          
            array.push $affected_users {
              value = {user_id: $u.id, email: $u.email, ip: $ip, keys_updated: $user_keys_updated}
            }
          }
        }
      }
    }
  }

  response = {
    dry_run          : $input.dry_run
    users_with_ip    : $users_with_ip
    keys_updated     : $keys_updated
    keys_skipped     : $keys_skipped
    affected_users   : $affected_users
  }
  guid = "kw6tsrWlvd5sL2Q1Y_QjeLqW2OU"
}
