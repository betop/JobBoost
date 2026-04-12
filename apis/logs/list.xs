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
    timestamp date_from?
    timestamp date_to?
    timestamp updated_since?
    int page?=1
    int per_page?=1000
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
  
    var $has_from {
      value = $input.date_from != null
    }
  
    var $has_to {
      value = $input.date_to != null
    }
  
    conditional {
      // ── Delta mode: return everything touched since updated_since ──
      if ($is_delta) {
        db.query generation_log {
          where = ($db.generation_log.created_at >= $input.updated_since || $db.generation_log.updated_at >= $input.updated_since)
          sort = {generation_log.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.per_page}
          }
        } as $logs
      }
    
      // ── Full fetch mode: filter by date range ──
      else {
        db.query generation_log {
          where = (($has_from == false || $db.generation_log.created_at >= $input.date_from) && ($has_to == false || $db.generation_log.created_at <= $input.date_to))
          sort = {generation_log.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.per_page}
          }
        } as $logs
      }
    }
  
    // ── Access control: admins see only logs for their profiles ──
    conditional {
      if ($auth_user.type == "super_admin") {
        // Super admin sees everything — no filtering needed
        var $filtered_items {
          value = $logs.items
        }
      }
    
      else {
        // Build set of allowed profile IDs for this admin
        // 1. Profiles created by this admin
        // 2. Profiles assigned to this admin (in auth_user.profile_ids)
        db.query profile {
          where = $db.profile.created_by == $auth.id
          return = {type: "list"}
        } as $created_profiles
      
        var $allowed_profile_ids {
          value = []
        }
      
        // Add created profile IDs
        foreach ($created_profiles) {
          each as $cp {
            array.push $allowed_profile_ids {
              value = $cp.id
            }
          }
        }
      
        // Add assigned profile IDs
        conditional {
          if ($auth_user.profile_ids != null) {
            foreach ($auth_user.profile_ids) {
              each as $apid {
                // Avoid duplicates — check before adding
                var $already_in {
                  value = false
                }
              
                foreach ($allowed_profile_ids) {
                  each as $existing {
                    conditional {
                      if ($existing == $apid) {
                        var.update $already_in {
                          value = true
                        }
                      }
                    }
                  }
                }
              
                conditional {
                  if ($already_in == false) {
                    array.push $allowed_profile_ids {
                      value = $apid
                    }
                  }
                }
              }
            }
          }
        }
      
        // Filter logs to only include those with a matching profile_id
        var $filtered_items {
          value = []
        }
      
        foreach ($logs.items) {
          each as $log {
            foreach ($allowed_profile_ids) {
              each as $aid {
                conditional {
                  if ($log.profile_id == $aid) {
                    array.push $filtered_items {
                      value = $log
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  response = {
    items      : $filtered_items
    total_count: $logs.itemsReceived
    cur_page   : $logs.curPage
    next_page  : $logs.nextPage
    prev_page  : $logs.prevPage
    per_page   : $logs.perPage
  }
}