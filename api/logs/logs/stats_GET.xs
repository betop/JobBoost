// Generation stats summary — used by admin dashboard and logs page
// Returns per-day counts and top bidders/profiles for a date range
// super_admins: see all logs
// admins: see only logs for bidders they created or are assigned
query "logs/stats" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    text period?=month
    uuid profile_id?
    uuid user_id?
    timestamp date_from?
    timestamp date_to?
  }

  stack {
    // Get auth user to determine access scope
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Build list of allowed bidder IDs for admins
    var $allowed_bidder_ids {
      value = []
    }
  
    conditional {
      if ($auth_user.type != "super_admin") {
        // Admin: build list of bidders they can see
        db.query users {
          where = $db.users.type == "bidder"
          return = {type: "list"}
        } as $all_bidders
      
        var $assigned {
          value = $auth_user.assigned_bidder_ids
        }
      
        conditional {
          if ($assigned == null) {
            var.update $assigned {
              value = []
            }
          }
        }
      
        foreach ($all_bidders) {
          each as $u {
            conditional {
              if ($u.created_by == $auth.id) {
                array.push $allowed_bidder_ids {
                  value = $u.id
                }
              }
            
              else {
                foreach ($assigned) {
                  each as $bid {
                    conditional {
                      if ($bid == $u.id) {
                        array.push $allowed_bidder_ids {
                          value = $u.id
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
    }
  
    var $resolved_from {
      value = $input.date_from
    }
  
    var $resolved_to {
      value = $input.date_to
    }
  
    var $secs_back {
      value = 2592000
    }
  
    conditional {
      if ($input.period == "week") {
        var.update $secs_back {
          value = 604800
        }
      }
    
      elseif ($input.period == "today") {
        var.update $secs_back {
          value = 86400
        }
      }
    }
  
    var $neg_secs {
      value = 0 - $secs_back
    }
  
    conditional {
      if ($resolved_from == null) {
        var.update $resolved_from {
          value = now|add_secs_to_timestamp:$neg_secs
        }
      }
    }
  
    var $has_from {
      value = $resolved_from != null
    }
  
    var $has_to {
      value = $resolved_to != null
    }
  
    // Fetch all logs in period — UUID filters applied below in XanoScript to avoid 22P02
    db.query generation_log {
      where = (($has_from == false || $db.generation_log.created_at >= $resolved_from) && ($has_to == false || $db.generation_log.created_at <= $resolved_to))
      return = {type: "list"}
    } as $period_logs_raw
  
    // Post-filter by profile_id / user_id if provided, and by allowed_bidder_ids for admins
    var $period_logs {
      value = []
    }
  
    foreach ($period_logs_raw) {
      each as $log {
        var $include {
          value = true
        }
      
        // Filter by profile_id if provided
        conditional {
          if ($input.profile_id != null && $log.profile_id != $input.profile_id) {
            var.update $include {
              value = false
            }
          }
        }
      
        // Filter by user_id if provided
        conditional {
          if ($input.user_id != null && $log.user_id != $input.user_id) {
            var.update $include {
              value = false
            }
          }
        }
      
        // For admins: filter by allowed bidders
        conditional {
          if ($auth_user.type != "super_admin" && $include) {
            var $bidder_allowed {
              value = false
            }
          
            foreach ($allowed_bidder_ids) {
              each as $allowed_id {
                conditional {
                  if ($log.user_id == $allowed_id) {
                    var.update $bidder_allowed {
                      value = true
                    }
                  }
                }
              }
            }
          
            conditional {
              if ($bidder_allowed == false) {
                var.update $include {
                  value = false
                }
              }
            }
          }
        }
      
        conditional {
          if ($include) {
            var.update $period_logs {
              value = $period_logs|push:$log
            }
          }
        }
      }
    }
  
    var $total_count {
      value = $period_logs|count
    }
  
    var $total_input_tokens {
      value = 0
    }
  
    var $total_output_tokens {
      value = 0
    }
  
    // Provider breakdown counters
    var $claude_count {
      value = 0
    }
  
    var $openai_count {
      value = 0
    }
  
    // Match breakdown counters
    var $matched_count {
      value = 0
    }
  
    var $mismatched_count {
      value = 0
    }
  
    var $skipped_count {
      value = 0
    }
  
    var $duplicated_count {
      value = 0
    }
  
    var $not_jd_count {
      value = 0
    }
  
    var $reposted_count {
      value = 0
    }
  
    var $error_count {
      value = 0
    }
  
    var $applied_count {
      value = 0
    }
  
    foreach ($period_logs) {
      each as $log {
        conditional {
          if ($log.input_tokens != null) {
            var.update $total_input_tokens {
              value = $total_input_tokens + $log.input_tokens
            }
          }
        }
      
        conditional {
          if ($log.output_tokens != null) {
            var.update $total_output_tokens {
              value = $total_output_tokens + $log.output_tokens
            }
          }
        }
      
        conditional {
          if ($log.ai_provider == "claude") {
            var.update $claude_count {
              value = $claude_count + 1
            }
          }
        
          else {
            var.update $openai_count {
              value = $openai_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 1) {
            var.update $matched_count {
              value = $matched_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 0) {
            var.update $mismatched_count {
              value = $mismatched_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 2) {
            var.update $skipped_count {
              value = $skipped_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 4) {
            var.update $duplicated_count {
              value = $duplicated_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 3) {
            var.update $not_jd_count {
              value = $not_jd_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 5) {
            var.update $reposted_count {
              value = $reposted_count + 1
            }
          }
        }
      
        conditional {
          if ($log.is_matched == 6) {
            var.update $error_count {
              value = $error_count + 1
            }
          }
        }
      
        // Count as applied if is_applied=true OR is_matched=1 (matched = auto-applied)
        conditional {
          if ($log.is_applied || $log.is_matched == 1) {
            var.update $applied_count {
              value = $applied_count + 1
            }
          }
        }
      }
    }
  
    // All-time totals
    db.query generation_log {
      return = {type: "list"}
    } as $all_logs_raw
  
    // Filter all-time logs by allowed bidders for admins
    var $all_logs {
      value = []
    }
  
    foreach ($all_logs_raw) {
      each as $log {
        var $include_all {
          value = true
        }
      
        conditional {
          if ($auth_user.type != "super_admin") {
            var $bidder_allowed {
              value = false
            }
          
            foreach ($allowed_bidder_ids) {
              each as $allowed_id {
                conditional {
                  if ($log.user_id == $allowed_id) {
                    var.update $bidder_allowed {
                      value = true
                    }
                  }
                }
              }
            }
          
            conditional {
              if ($bidder_allowed == false) {
                var.update $include_all {
                  value = false
                }
              }
            }
          }
        }
      
        conditional {
          if ($include_all) {
            array.push $all_logs {
              value = $log
            }
          }
        }
      }
    }
  
    var $all_time_total {
      value = $all_logs|count
    }
  
    var $all_time_input_tokens {
      value = 0
    }
  
    var $all_time_output_tokens {
      value = 0
    }
  
    foreach ($all_logs) {
      each as $log {
        conditional {
          if ($log.input_tokens != null) {
            var.update $all_time_input_tokens {
              value = $all_time_input_tokens + $log.input_tokens
            }
          }
        }
      
        conditional {
          if ($log.output_tokens != null) {
            var.update $all_time_output_tokens {
              value = $all_time_output_tokens + $log.output_tokens
            }
          }
        }
      }
    }
  }

  response = {
    period                : $input.period
    total_generations     : $total_count
    total_input_tokens    : $total_input_tokens
    total_output_tokens   : $total_output_tokens
    claude_count          : $claude_count
    openai_count          : $openai_count
    matched_count         : $matched_count
    mismatched_count      : $mismatched_count
    skipped_count         : $skipped_count
    duplicated_count      : $duplicated_count
    not_jd_count          : $not_jd_count
    reposted_count        : $reposted_count
    error_count           : $error_count
    applied_count         : $applied_count
    all_time_total        : $all_time_total
    all_time_input_tokens : $all_time_input_tokens
    all_time_output_tokens: $all_time_output_tokens
  }

  guid = "uxTBJvs2GoufaK231ekYr1_K0PA"
}