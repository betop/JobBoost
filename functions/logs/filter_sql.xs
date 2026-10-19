// Builds the WHERE clause for generation-log queries (logs/list, logs/summary). Single place for:
//   - access control: super_admin sees all logs, admins only logs of their profiles
//   - hidden profiles are excluded for everyone
//   - date window, search (job/position/company/user/profile name), profile / user / status / type / model filters
// Returns the clause including the leading " WHERE" (empty string when there is no condition).
function "logs/filter_sql" {
  description = "WHERE clause for generation logs (access scope + filters)"

  input {
    uuid auth_id
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
      field_value = $input.auth_id
    } as $auth_user

    var $conds {
      value = []
    }

    // Admin scope: only the profiles assigned to / created by this admin
    conditional {
      if ($auth_user != null && $auth_user.type == "admin") {
        var $admin_profiles {
          value = ""
        }

        foreach ($auth_user.profile_ids) {
          each as $pid {
            var.update $admin_profiles {
              value = $admin_profiles ~ ($admin_profiles == "" ? "" : ",") ~ ($pid|to_text|sql_esc)
            }
          }
        }

        conditional {
          if ($admin_profiles == "") {
            array.push $conds {
              value = "FALSE"
            }
          }

          else {
            array.push $conds {
              value = "profile_id IN (" ~ $admin_profiles ~ ")"
            }
          }
        }
      }
    }

    // Hidden profiles are never listed
    array.push $conds {
      value = "(profile_id IS NULL OR profile_id NOT IN (SELECT id FROM x1_5 WHERE hide = true))"
    }

    conditional {
      if ($input.date_from != null) {
        array.push $conds {
          value = "created_at >= '" ~ ($input.date_from|to_text) ~ "'"
        }
      }
    }

    conditional {
      if ($input.date_to != null) {
        array.push $conds {
          value = "created_at < '" ~ ($input.date_to|to_text) ~ "'"
        }
      }
    }

    conditional {
      if ($input.profile_ids != null && ($input.profile_ids|count) > 0) {
        var $pl {
          value = ""
        }

        foreach ($input.profile_ids) {
          each as $pid {
            var.update $pl {
              value = $pl ~ ($pl == "" ? "" : ",") ~ ($pid|to_text|sql_esc)
            }
          }
        }

        array.push $conds {
          value = "profile_id IN (" ~ $pl ~ ")"
        }
      }
    }

    // User filter: the special admin id (all-zero uuid) means logs with no user
    conditional {
      if ($input.user_ids != null && ($input.user_ids|count) > 0) {
        var $ul {
          value = ""
        }

        var $include_admin {
          value = false
        }

        foreach ($input.user_ids) {
          each as $uid {
            conditional {
              if ($uid == "00000000-0000-0000-0000-000000000000") {
                var.update $include_admin {
                  value = true
                }
              }

              else {
                var.update $ul {
                  value = $ul ~ ($ul == "" ? "" : ",") ~ ($uid|to_text|sql_esc)
                }
              }
            }
          }
        }

        conditional {
          if ($include_admin && $ul == "") {
            array.push $conds {
              value = "user_id IS NULL"
            }
          }

          elseif ($include_admin) {
            array.push $conds {
              value = "(user_id IS NULL OR user_id IN (" ~ $ul ~ "))"
            }
          }

          else {
            array.push $conds {
              value = "user_id IN (" ~ $ul ~ ")"
            }
          }
        }
      }
    }

    conditional {
      if ($input.matched != null && ($input.matched|count) > 0) {
        var $ml {
          value = ""
        }

        foreach ($input.matched) {
          each as $m {
            var.update $ml {
              value = $ml ~ ($ml == "" ? "" : ",") ~ (($m|to_int)|to_text)
            }
          }
        }

        array.push $conds {
          value = "is_matched IN (" ~ $ml ~ ")"
        }
      }
    }

    conditional {
      if ($input.regenerated != null && ($input.regenerated|count) > 0) {
        var $rl {
          value = ""
        }

        foreach ($input.regenerated) {
          each as $r {
            var.update $rl {
              value = $rl ~ ($rl == "" ? "" : ",") ~ (($r|to_int)|to_text)
            }
          }
        }

        array.push $conds {
          value = "is_regenerated IN (" ~ $rl ~ ")"
        }
      }
    }

    // Model filter: logs without a stored model count as Haiku 4.5 (the only model before)
    conditional {
      if ($input.ai_models != null && ($input.ai_models|count) > 0) {
        var $al {
          value = ""
        }

        foreach ($input.ai_models) {
          each as $a {
            var.update $al {
              value = $al ~ ($al == "" ? "" : ",") ~ ($a|sql_esc)
            }
          }
        }

        array.push $conds {
          value = "COALESCE(ai_model, 'claude-haiku-4-5') IN (" ~ $al ~ ")"
        }
      }
    }

    // Search across job url, position, company, description and the user / profile names
    conditional {
      if ($input.search != null && ($input.search|trim) != "") {
        var $raw_pattern {
          value = "%" ~ (($input.search|trim)|replace:"%":"") ~ "%"
        }

        var $pattern {
          value = $raw_pattern|sql_esc
        }

        array.push $conds {
          value = "(position_title ILIKE " ~ $pattern ~ " OR company_name ILIKE " ~ $pattern ~ " OR job_url ILIKE " ~ $pattern ~ " OR job_description_snippet ILIKE " ~ $pattern ~ " OR user_id IN (SELECT u.id FROM x1_2 u WHERE u.full_name ILIKE " ~ $pattern ~ ") OR profile_id IN (SELECT p.id FROM x1_5 p WHERE p.full_name ILIKE " ~ $pattern ~ "))"
        }
      }
    }

    var $sql {
      value = ""
    }

    foreach ($conds) {
      each as $c {
        var.update $sql {
          value = $sql ~ ($sql == "" ? " WHERE " : " AND ") ~ $c
        }
      }
    }
  }

  response = $sql

  guid = "LgFilterSqlQ7wNcT2pLsY9kBd6eXh"
}
