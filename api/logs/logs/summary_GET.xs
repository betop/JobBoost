//  Totals for the generation-logs stat cards, over ALL logs matching the same filters as logs/list
//  (not only the visible page). Counts by status, tokens, applied, and - super_admin only - the estimated cost.
//  Cost uses the billing price logic: token sums per group (model, price rate, billing admin) x the rate that
//  applies to those logs. Rows are also grouped by price tier (prompt > 100K tokens) and rows with a stored per-call
//  raw_cost_usd use it as-is. super_admin only: raw_cost_usd (actual), est_cost_usd (billed), real_income_usd = billed - actual.
query "logs/summary" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    timestamp date_from?
    timestamp date_to?
    text search?
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

    var $group_sql {
      value = "SELECT is_matched, COALESCE(ai_model, 'claude-haiku-4-5') AS model, ((COALESCE(input_tokens, 0) + COALESCE(cache_creation_input_tokens, 0) + COALESCE(cache_read_input_tokens, 0)) > 100000) AS big_prompt, usage_rate, billing_admin_id, COUNT(*) AS n, COALESCE(SUM(input_tokens), 0) AS in_t, COALESCE(SUM(output_tokens), 0) AS out_t, COALESCE(SUM(cache_creation_input_tokens), 0) AS cw_t, COALESCE(SUM(cache_read_input_tokens), 0) AS cr_t, COALESCE(SUM(raw_cost_usd), 0) AS stored_raw, COALESCE(SUM(CASE WHEN raw_cost_usd IS NULL THEN input_tokens END), 0) AS c_in_t, COALESCE(SUM(CASE WHEN raw_cost_usd IS NULL THEN output_tokens END), 0) AS c_out_t, COALESCE(SUM(CASE WHEN raw_cost_usd IS NULL THEN cache_creation_input_tokens END), 0) AS c_cw_t, COALESCE(SUM(CASE WHEN raw_cost_usd IS NULL THEN cache_read_input_tokens END), 0) AS c_cr_t, COALESCE(SUM(CASE WHEN ai_provider = 'claude' THEN 1 ELSE 0 END), 0) AS claude_n, COALESCE(SUM(CASE WHEN is_applied = true OR is_matched = 1 THEN 1 ELSE 0 END), 0) AS applied_n FROM x1_7" ~ $where ~ " GROUP BY is_matched, COALESCE(ai_model, 'claude-haiku-4-5'), ((COALESCE(input_tokens, 0) + COALESCE(cache_creation_input_tokens, 0) + COALESCE(cache_read_input_tokens, 0)) > 100000), usage_rate, billing_admin_id"
    }

    db.direct_query {
      sql = "{{ $group_sql }};"
      parser = "template_engine"
      response_type = "list"
    } as $groups

    var $is_super {
      value = $auth_user != null && $auth_user.type == "super_admin"
    }

    // Status buckets (is_matched codes; null = none)
    var $by_status {
      value = {matched: 0, mismatched: 0, skipped: 0, not_jd: 0, duplicated: 0, reposted: 0, error: 0, unknown: 0}
    }

    var $total {
      value = 0
    }

    var $applied {
      value = 0
    }

    var $claude_count {
      value = 0
    }

    var $in_total {
      value = 0
    }

    var $out_total {
      value = 0
    }

    var $cw_total {
      value = 0
    }

    var $cr_total {
      value = 0
    }

    var $raw_total {
      value = 0
    }

    var $est_total {
      value = 0
    }

    var $rates_cache {
      value = {}
    }

    var $admin_rate_cache {
      value = {}
    }

    var $default_rate {
      value = 1.5
    }

    var $default_model_rates {
      value = {}
    }

    conditional {
      if ($is_super) {
        function.run "credits/get_usage_rate" {
          input = {}
        } as $default_info

        var.update $default_rate {
          value = $default_info.usage_rate
        }

        var.update $default_model_rates {
          value = $default_info.model_rates
        }
      }
    }

    foreach ($groups) {
      each as $g {
        var $status_key {
          value = "unknown"
        }

        conditional {
          if ($g.is_matched == 1) {
            var.update $status_key {
              value = "matched"
            }
          }

          elseif ($g.is_matched == 0) {
            var.update $status_key {
              value = "mismatched"
            }
          }

          elseif ($g.is_matched == 2) {
            var.update $status_key {
              value = "skipped"
            }
          }

          elseif ($g.is_matched == 3) {
            var.update $status_key {
              value = "not_jd"
            }
          }

          elseif ($g.is_matched == 4) {
            var.update $status_key {
              value = "duplicated"
            }
          }

          elseif ($g.is_matched == 5) {
            var.update $status_key {
              value = "reposted"
            }
          }

          elseif ($g.is_matched == 6) {
            var.update $status_key {
              value = "error"
            }
          }
        }

        var.update $by_status {
          value = $by_status|set:$status_key:(($by_status|get:$status_key) + $g.n)
        }

        var.update $total {
          value = $total + $g.n
        }

        var.update $applied {
          value = $applied + $g.applied_n
        }

        var.update $claude_count {
          value = $claude_count + $g.claude_n
        }

        var.update $in_total {
          value = $in_total + $g.in_t
        }

        var.update $out_total {
          value = $out_total + $g.out_t
        }

        var.update $cw_total {
          value = $cw_total + $g.cw_t
        }

        var.update $cr_total {
          value = $cr_total + $g.cr_t
        }

        conditional {
          if ($is_super) {
            // Model prices for this group's price tier (rows are grouped by prompt size > 100K tokens,
            // so Haiku 5.5's tier is chosen per request, not per sum)
            var $tier_key {
              value = $g.model ~ "|" ~ ($g.big_prompt ? "big" : "base")
            }

            conditional {
              if (!($rates_cache|has:$tier_key)) {
                function.run "ai/claude_haiku_rates" {
                  input = {model: $g.model, prompt_tokens: $g.big_prompt ? 100001 : 0}
                } as $model_rates

                var.update $rates_cache {
                  value = $rates_cache|set:$tier_key:$model_rates
                }
              }
            }

            var $m_rates {
              value = $rates_cache|get:$tier_key
            }

            // Price rate: the log's own rate, else the billing admin's personal rate, else the global rate
            var $g_rate {
              value = ($default_model_rates|get:$g.model)|first_notnull:$default_rate
            }

            conditional {
              if ($g.usage_rate != null && $g.usage_rate > 0) {
                var.update $g_rate {
                  value = $g.usage_rate
                }
              }

              elseif ($g.billing_admin_id != null) {
                var $adm_key {
                  value = ($g.billing_admin_id|to_text) ~ "|" ~ $g.model
                }

                conditional {
                  if (!($admin_rate_cache|has:$adm_key)) {
                    function.run "credits/get_usage_rate" {
                      input = {admin_id: $g.billing_admin_id, model: $g.model}
                    } as $adm_info

                    var.update $admin_rate_cache {
                      value = $admin_rate_cache|set:$adm_key:$adm_info.usage_rate
                    }
                  }
                }

                var.update $g_rate {
                  value = $admin_rate_cache|get:$adm_key
                }
              }
            }

            var $g_raw {
              value = ($g.stored_raw|to_decimal) + ((($g.c_in_t * $m_rates.input_per_million) + ($g.c_out_t * $m_rates.output_per_million) + ($g.c_cw_t * $m_rates.cache_write_per_million) + ($g.c_cr_t * $m_rates.cache_read_per_million)) / 1000000)
            }

            var.update $raw_total {
              value = $raw_total + $g_raw
            }

            var.update $est_total {
              value = $est_total + ($g_raw * $g_rate)
            }
          }
        }
      }
    }
  }

  response = {
    total           : $total
    by_status       : $by_status
    applied         : $applied
    claude_count    : $claude_count
    openai_count    : $total - $claude_count
    input_tokens    : $in_total
    output_tokens   : $out_total
    cache_write_tokens: $cw_total
    cache_read_tokens : $cr_total
    raw_cost_usd    : $is_super ? ($raw_total|round:8) : null
    est_cost_usd    : $is_super ? ($est_total|round:8) : null
    real_income_usd : $is_super ? (($est_total - $raw_total)|round:8) : null
  }

  guid = "LgSummaryQ2wNcT8pLsY5kBd3eXaZ"
}
