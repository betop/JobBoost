//  List generation logs, one page at a time (server-side search, filters, sort and paging)
//  - limit: page size (default 50, max 200); offset: rows to skip
//  - sort_field: created_at (default) | position_title | company_name | user_name | profile_name; sort_dir: asc | desc (default)
//  - search / profile_ids / user_ids / matched / regenerated / ai_models / date_from / date_to: see logs/filter_sql
//  Returns {items, total}. Each item carries user_name / profile_name. Billing fields are for super_admin only;
//  est_cost_usd = raw provider cost x price rate (same logic as billing), computed for the rows of this page.
query "logs/list" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    timestamp date_from?
    timestamp date_to?
    text search?
    int offset?=0
    int limit?=50
    text sort_field?
    text sort_dir?
    uuid[] profile_ids?
    text[] user_ids?
    text[] matched?
    text[] regenerated?
    text[] ai_models?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user

    function.run "logs/filter_sql" {
      input = {
        auth_id     : $auth.id
        date_from   : $input.date_from
        date_to     : $input.date_to
        search      : $input.search
        profile_ids : $input.profile_ids
        user_ids    : $input.user_ids
        matched     : $input.matched
        regenerated : $input.regenerated
        ai_models   : $input.ai_models
      }
    } as $where

    // Paging bounds
    var $page_limit {
      value = $input.limit
    }

    conditional {
      if ($page_limit < 1) {
        var.update $page_limit {
          value = 50
        }
      }
    }

    conditional {
      if ($page_limit > 200) {
        var.update $page_limit {
          value = 200
        }
      }
    }

    var $page_offset {
      value = $input.offset
    }

    conditional {
      if ($page_offset < 0) {
        var.update $page_offset {
          value = 0
        }
      }
    }

    // Sort (whitelisted columns only)
    var $sort_col {
      value = "created_at"
    }

    conditional {
      if ($input.sort_field == "position_title") {
        var.update $sort_col {
          value = "position_title"
        }
      }

      elseif ($input.sort_field == "company_name") {
        var.update $sort_col {
          value = "company_name"
        }
      }

      elseif ($input.sort_field == "user_name") {
        var.update $sort_col {
          value = "user_name"
        }
      }

      elseif ($input.sort_field == "profile_name") {
        var.update $sort_col {
          value = "profile_name"
        }
      }
    }

    var $sort_order {
      value = "DESC"
    }

    conditional {
      if ($input.sort_dir == "asc") {
        var.update $sort_order {
          value = "ASC"
        }
      }
    }

    var $billing_cols {
      value = ""
    }

    conditional {
      if ($auth_user != null && $auth_user.type == "super_admin") {
        var.update $billing_cols {
          value = ", usage_rate, charged_amount, billing_admin_id"
        }
      }
    }

    var $query {
      value = "SELECT id, created_at, updated_at, profile_id, user_id, job_url, job_description_snippet, ai_provider, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, resume_filename, cover_letter_filename, position_title, company_name, is_regenerated, original_log_id, is_matched, match_reason, is_applied, seniority, tech_scope, compensation, content_id, COALESCE((SELECT u.deleted FROM x1_2 u WHERE u.id = x1_7.user_id), false) AS user_deleted, (job_description IS NOT NULL AND job_description <> '') AS has_job_description, COALESCE(ai_model, 'claude-haiku-4-5') AS ai_model, (SELECT u.full_name FROM x1_2 u WHERE u.id = x1_7.user_id) AS user_name, (SELECT p.full_name FROM x1_5 p WHERE p.id = x1_7.profile_id) AS profile_name" ~ $billing_cols ~ " FROM x1_7" ~ $where ~ " ORDER BY " ~ $sort_col ~ " " ~ $sort_order ~ ", id " ~ $sort_order ~ " LIMIT " ~ ($page_limit|to_text) ~ " OFFSET " ~ ($page_offset|to_text)
    }

    var $count_query {
      value = "SELECT COUNT(*) AS total FROM x1_7" ~ $where
    }

    db.direct_query {
      sql = "{{ $query }};"
      parser = "template_engine"
      response_type = "list"
    } as $logs

    db.direct_query {
      sql = "{{ $count_query }};"
      parser = "template_engine"
      response_type = "single"
    } as $count_row

    // Cost per row of this page (super_admin only): same pricing logic as billing
    var $items {
      value = $logs
    }

    conditional {
      if ($auth_user != null && $auth_user.type == "super_admin") {
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
              value = ($default_rate_info.model_rates|get:($lg.ai_model|first_notnull:"claude-haiku-4-5"))|first_notnull:$default_rate_info.usage_rate
            }

            conditional {
              if ($lg.usage_rate != null && $lg.usage_rate > 0) {
                var.update $lg_rate {
                  value = $lg.usage_rate
                }
              }

              elseif ($lg.billing_admin_id != null) {
                var.update $cache_key {
                  value = ($lg.billing_admin_id|to_text) ~ "|" ~ ($lg.ai_model|first_notnull:"claude-haiku-4-5")
                }

                conditional {
                  if (!($rate_cache|has:$cache_key)) {
                    function.run "credits/get_usage_rate" {
                      input = {admin_id: $lg.billing_admin_id, model: $lg.ai_model|first_notnull:"claude-haiku-4-5"}
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

        var.update $items {
          value = $enriched
        }
      }
    }
  }

  response = {items: $items, total: $count_row.total|first_notnull:0}

  guid = "AIYv-aZ2F4QwpeGMhvFPE5USbXc"
}
