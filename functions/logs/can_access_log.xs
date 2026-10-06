// Single source of truth for "may this user see this generation log?".
// Mirrors the scoping of logs/list exactly (evaluated in SQL, same predicates):
//   - super_admin: every log
//   - admin: logs whose profile_id is in the admin's profile_ids
//   - all roles: logs of hidden profiles are excluded
//   - any other role / unknown user: nothing
// Identify the log by log_id or by content_id (one of them is required).
// Done in SQL on purpose: the array `|contains` filter compares uuid values by type and
// wrongly returned false for admins that logs/list (SQL IN) did show.
function "logs/can_access_log" {
  description = "True when the user is allowed to access the generation log (same rules as logs/list)"

  input {
    uuid user_id?
    uuid log_id?
    uuid content_id?
  }

  stack {
    var $allowed {
      value = false
    }
  
    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $u
  
    conditional {
      if ($u != null && $u.deleted != true && ($input.log_id != null || $input.content_id != null) && ($u.type == "super_admin" || $u.type == "admin")) {
        var $where {
          value = $input.log_id != null ? ("id = " ~ ($input.log_id|sql_esc)) : ("content_id = " ~ ($input.content_id|sql_esc))
        }
      
        conditional {
          if ($u.type == "admin") {
            var $pids {
              value = ""
            }
          
            foreach ($u.profile_ids) {
              each as $id {
                var.update $pids {
                  value = $pids ~ ($pids == "" ? "" : ",") ~ ($id|sql_esc)
                }
              }
            }
          
            var.update $where {
              value = $where ~ " AND profile_id IN (" ~ ($pids == "" ? "NULL" : $pids) ~ ")"
            }
          }
        }
      
        var $sql {
          value = "SELECT COUNT(*) AS total FROM x1_7 WHERE " ~ $where ~ " AND (profile_id IS NULL OR profile_id NOT IN (SELECT id FROM x1_5 WHERE hide = true))"
        }
      
        db.direct_query {
          sql = "{{ $sql }};"
          parser = "template_engine"
          response_type = "single"
        } as $res
      
        var.update $allowed {
          value = ($res.total|to_int) > 0
        }
      }
    }
  }

  response = $allowed
  guid = "Lg4cAcc3ssL0gSc0pEqPf7Rk2Nw"
}
