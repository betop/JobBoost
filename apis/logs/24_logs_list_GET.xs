//  List generation logs — lightweight version
//  Returns raw logs without enrichment (name lookups done client-side)
// 
//  Two modes:
//   1. Full fetch:  send date_from / date_to  → returns all logs in that date range (paginated)
//   2. Delta fetch: send updated_since        → returns ALL records touched since that timestamp
//                   (created_at OR updated_at >= updated_since), no date range filter, no page limit
// 
//  Access control:
//   - super_admins see all logs
//   - admins see only logs whose profile_id is in their assigned/created profiles
// 
//  Frontend always sends EST-aligned timestamps for date_from/date_to.
query "logs/list" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    timestamp updated_since?
    int offset?
    int limit?
    bool count_only?
  }

  stack {
    // Get auth user to determine access scope
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    var $is_delta {
      value = $input.updated_since != null
    }
  
    var $query {
      value = "SELECT * FROM x1_7"
    }
  
    var $has_where {
      value = false
    }
  
    // {{ $auth.id|sql_esc }};"
    conditional {
      if ($auth_user.type != "super_admin" && $auth_user.type == "admin") {
        var $profile_ids {
          value = ""
        }

        // $auth_user.profile_ids != null ? (($auth_user.profile_ids|join:",")|sql_esc) : "NULL"
        foreach ($auth_user.profile_ids) {
          each as $id {
            var.update $profile_ids {
              value = $profile_ids ~ ( $profile_ids == "" ? "" : ",") ~ ($id|sql_esc)
            }
          }
        }

        var.update $query {
          value = $query ~ " WHERE profile_id IN (" ~ $profile_ids ~ ")"
        }

        var.update $has_where {
          value = true
        }
      }
    }

    // Exclude logs belonging to hidden profiles, for all user types
    var $hide_keyword {
      value = $has_where ? " AND" : " WHERE"
    }

    var.update $query {
      value = $query ~ $hide_keyword ~ " (profile_id IS NULL OR profile_id NOT IN (SELECT id FROM x1_5 WHERE hide = true))"
    }

    var.update $has_where {
      value = true
    }

    conditional {
      if ($is_delta) {
        var $delta_keyword {
          value = $has_where ? " AND" : " WHERE"
        }
      
        var.update $query {
          value = $query ~ $delta_keyword ~ " updated_at >= '" ~ $input.updated_since ~ "'"
        }
      }
    }
  
    var.update $query {
      value = $query ~ " ORDER BY created_at DESC"
    }
  
    var $page_limit {
      value = $input.limit != null ? $input.limit : 500
    }
  
    var $page_offset {
      value = $input.offset != null ? $input.offset : 0
    }
  
    conditional {
      if ($is_delta == false && $input.count_only != true) {
        var.update $query {
          value = $query ~ " LIMIT " ~ $page_limit ~ " OFFSET " ~ $page_offset
        }
      }
    }
  
    conditional {
      if ($input.count_only) {
        var $count_query {
          value = "SELECT COUNT(*) as total FROM (" ~ $query ~ ") AS sub"
        }
      
        db.direct_query {
          sql = "{{ $count_query }};"
          parser = "template_engine"
          response_type = "single"
        } as $count_result
      }
    }
  
    conditional {
      if ($input.count_only != true) {
        db.direct_query {
          sql = "{{ $query }};"
          parser = "template_engine"
          response_type = "list"
        } as $logs
      }
    }
  }

  response = $input.count_only == true ? {total: $count_result.total} : {items: $logs}
  guid = "AIYv-aZ2F4QwpeGMhvFPE5USbXc"
}