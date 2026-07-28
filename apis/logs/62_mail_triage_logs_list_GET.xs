// List mail triage logs — paginated, newest first
// Supports: date_from / date_to (ISO timestamps), offset / limit
// count_only=true returns { total } only
query "logs/mail-triage-logs" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    timestamp date_from?
    timestamp date_to?
    int offset?
    int limit?
    bool count_only?
  }

  stack {
    var $page_limit {
      value = $input.limit != null ? $input.limit : 500
    }
  
    var $page_offset {
      value = $input.offset != null ? $input.offset : 0
    }
  
    var $query {
      value = "SELECT * FROM x1_12"
    }
  
    var $has_where {
      value = false
    }
  
    conditional {
      if ($input.date_from != null) {
        var.update $query {
          value = $query ~ " WHERE created_at >= '" ~ $input.date_from ~ "'"
        }
      
        var.update $has_where {
          value = true
        }
      }
    }
  
    conditional {
      if ($input.date_to != null) {
        var $kw {
          value = $has_where ? " AND" : " WHERE"
        }
      
        var.update $query {
          value = $query ~ $kw ~ " created_at <= '" ~ $input.date_to ~ "'"
        }
      }
    }
  
    var.update $query {
      value = $query ~ " ORDER BY created_at DESC"
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
        var $paged_query {
          value = $query ~ " LIMIT " ~ $page_limit ~ " OFFSET " ~ $page_offset
        }
      
        db.direct_query {
          sql = "{{ $paged_query }};"
          parser = "template_engine"
          response_type = "list"
        } as $raw_logs
      
        // Enrich with profile_name
        var $out {
          value = []
        }
      
        foreach ($raw_logs) {
          each as $row {
            var $profile_name {
              value = null
            }
          
            conditional {
              if ($row.profile_id != null) {
                db.get profile {
                  field_name = "id"
                  field_value = $row.profile_id
                } as $prof
              
                conditional {
                  if ($prof != null) {
                    var.update $profile_name {
                      value = $prof.full_name
                    }
                  }
                }
              }
            }
          
            array.push $out {
              value = {
                id           : $row.id
                created_at   : $row.created_at
                gmail_email  : $row.gmail_email
                profile_id   : $row.profile_id
                profile_name : $profile_name
                input_tokens : $row.input_tokens
                output_tokens: $row.output_tokens
                email_count  : $row.email_count
              }
            }
          }
        }
      }
    }
  }

  response = $input.count_only == true ? {total: $count_result.total} : {items: $out}
  guid = "9SJIGP3wDLnuz6GSJku-anccKHo"
}