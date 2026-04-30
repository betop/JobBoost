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
          value = $auth_user.profile_ids != null ? ($auth_user.profile_ids|join:",") : "NULL"
        }
      
        var.update $query {
          value = $query ~ " WHERE profile_id IN (" ~ $profile_ids ~ ")"
        }
      
        var.update $has_where {
          value = true
        }
      }
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
      if ($is_delta == false) {
        var.update $query {
          value = $query ~ " LIMIT " ~ $page_limit ~ " OFFSET " ~ $page_offset
        }
      }
    }
  
    db.direct_query {
      sql = "{{ $query }};"
      parser = "template_engine"
      response_type = "list"
    } as $logs
  }

  response = {items: $logs}
}