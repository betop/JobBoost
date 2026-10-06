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
      
        // Resolve profile from the log's gmail_email (no profile_id column on this table); cached per email
        var $out {
          value = []
        }
      
        var $email_cache {
          value = {}
        }
      
        foreach ($raw_logs) {
          each as $row {
            var $profile_id {
              value = null
            }
          
            var $profile_name {
              value = null
            }
          
            var $email_key {
              value = ($row.gmail_email|to_text|trim|to_lower)
            }
          
            conditional {
              if ($email_key != "") {
                conditional {
                  if (($email_cache|has:$email_key) == false) {
                    var $lookup_sql {
                      value = "SELECT id, full_name FROM x1_5 WHERE LOWER(TRIM(email)) = " ~ ($email_key|sql_esc) ~ " ORDER BY created_at ASC LIMIT 1"
                    }
                  
                    db.direct_query {
                      sql = "{{ $lookup_sql }};"
                      parser = "template_engine"
                      response_type = "list"
                    } as $found
                  
                    var $match {
                      value = null
                    }
                  
                    conditional {
                      if (($found|count) > 0) {
                        var $first_row {
                          value = $found|first
                        }
                      
                        var.update $match {
                          value = {id: $first_row.id, full_name: $first_row.full_name}
                        }
                      }
                    }
                  
                    var.update $email_cache {
                      value = $email_cache|set:$email_key:$match
                    }
                  }
                }
              
                var $cached {
                  value = $email_cache|get:$email_key
                }
              
                conditional {
                  if ($cached != null) {
                    var.update $profile_id {
                      value = $cached.id
                    }
                  
                    var.update $profile_name {
                      value = $cached.full_name
                    }
                  }
                }
              }
            }
          
            array.push $out {
              value = {
                id                         : $row.id
                created_at                 : $row.created_at
                gmail_email                : $row.gmail_email
                profile_id                 : $profile_id
                profile_name               : $profile_name
                input_tokens               : $row.input_tokens
                output_tokens              : $row.output_tokens
                cache_creation_input_tokens: $row.cache_creation_input_tokens
                cache_read_input_tokens    : $row.cache_read_input_tokens
                email_count                : $row.email_count
                usage_rate                 : $row.usage_rate
                charged_amount             : $row.charged_amount
                billing_admin_id           : $row.billing_admin_id
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