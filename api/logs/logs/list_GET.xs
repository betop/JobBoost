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
    timestamp date_from?
    timestamp date_to?
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
  
    // Lean projection: the heavy job_description text is NOT returned (it is fetched
    // on demand via logs/jd); has_job_description tells the UI whether one exists.
    var $query {
      value = "SELECT id, created_at, updated_at, profile_id, user_id, job_url, job_description_snippet, ai_provider, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, resume_filename, cover_letter_filename, position_title, company_name, is_regenerated, original_log_id, is_matched, match_reason, is_applied, seniority, tech_scope, compensation, content_id, COALESCE((SELECT u.deleted FROM x1_2 u WHERE u.id = x1_7.user_id), false) AS user_deleted, (job_description IS NOT NULL AND job_description <> '') AS has_job_description, COALESCE(ai_model, 'claude-haiku-4-5') AS ai_model FROM x1_7"
    }
  
    // Billing columns (rate, charged amount, billing admin, model) are for super_admin only
    conditional {
      if ($auth_user.type == "super_admin") {
        var.update $query {
          value = $query|replace:"COALESCE(ai_model, 'claude-haiku-4-5') AS ai_model FROM x1_7":"COALESCE(ai_model, 'claude-haiku-4-5') AS ai_model, usage_rate, charged_amount, billing_admin_id FROM x1_7"
        }
      }
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
  
    conditional {
      if ($input.date_from != null) {
        var $from_keyword {
          value = $has_where ? " AND" : " WHERE"
        }
      
        var.update $query {
          value = $query ~ $from_keyword ~ " created_at >= '" ~ $input.date_from ~ "'"
        }
      
        var.update $has_where {
          value = true
        }
      }
    }
  
    conditional {
      if ($input.date_to != null) {
        var $to_keyword {
          value = $has_where ? " AND" : " WHERE"
        }
      
        var.update $query {
          value = $query ~ $to_keyword ~ " created_at < '" ~ $input.date_to ~ "'"
        }
      
        var.update $has_where {
          value = true
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
      
        // Raw SQL ignores the request data source: point it at that data source's tables
        function.run "db/sql_for_datasource" {
          input = {sql: $count_query}
        } as $count_query_ds

        db.direct_query {
          sql = "{{ $count_query_ds }};"
          parser = "template_engine"
          response_type = "single"
        } as $count_result
      }
    }
  
    conditional {
      if ($input.count_only != true) {
        // Raw SQL ignores the request data source: point it at that data source's tables
        function.run "db/sql_for_datasource" {
          input = {sql: $query}
        } as $query_ds

        db.direct_query {
          sql = "{{ $query_ds }};"
          parser = "template_engine"
          response_type = "list"
        } as $logs
      }
    }

    // Estimated cost per log (super_admin only) = SAME pricing logic as billing:
    // ai/claude_haiku_cost (model prices, 1h cache write, 5.5 tiers) x price rate
    // (the rate stored on the log, else the billing admin's personal rate, else the global rate).
    conditional {
      if ($input.count_only != true && $auth_user.type == "super_admin") {
        function.run "credits/get_usage_rate" {
          input = {}
        } as $default_rate_info

        var $rate_cache {
          value = {}
        }

        var $cache_key {
          value = ""
        }

        var $enriched {
          value = []
        }

        foreach ($logs) {
          each as $lg {
            function.run "ai/claude_haiku_cost" {
              input = {
                model                : $lg.ai_model
                input_tokens         : $lg.input_tokens|first_notnull:0
                output_tokens        : $lg.output_tokens|first_notnull:0
                cache_creation_tokens: $lg.cache_creation_input_tokens|first_notnull:0
                cache_read_tokens    : $lg.cache_read_input_tokens|first_notnull:0
              }
            } as $lg_raw

            var $lg_rate {
              value = $default_rate_info.usage_rate
            }

            conditional {
              if ($lg.usage_rate != null && $lg.usage_rate > 0) {
                var.update $lg_rate {
                  value = $lg.usage_rate
                }
              }

              elseif ($lg.billing_admin_id != null) {
                var.update $cache_key {
                  value = $lg.billing_admin_id|to_text
                }

                conditional {
                  if (!($rate_cache|has:$cache_key)) {
                    function.run "credits/get_usage_rate" {
                      input = {admin_id: $lg.billing_admin_id}
                    } as $adm_rate

                    var.update $rate_cache {
                      value = $rate_cache|set:$cache_key:$adm_rate.usage_rate
                    }
                  }
                }

                var.update $lg_rate {
                  value = $rate_cache|get:$cache_key
                }
              }
            }

            var.update $enriched {
              value = $enriched|push:($lg|set:"raw_cost_usd":$lg_raw|set:"usage_rate_applied":$lg_rate|set:"est_cost_usd":(($lg_raw * $lg_rate)|round:8))
            }
          }
        }

        var.update $logs {
          value = $enriched
        }
      }
    }
  }

  response = $input.count_only == true ? {total: $count_result.total} : {items: $logs}
  guid = "AIYv-aZ2F4QwpeGMhvFPE5USbXc"
}