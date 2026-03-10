// Generation stats summary — used by admin dashboard and logs page
// Returns per-day counts and top bidders/profiles for a date range
query "logs/stats" verb=GET {
  api_group = "logs"
  auth = "admin"

  input {
    text period?=month
    uuid profile_id?
    uuid bidder_id?
    timestamp date_from?
    timestamp date_to?
  }

  stack {
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
  
    // Post-filter by profile_id / bidder_id if provided
    var $period_logs {
      value = []
    }
  
    foreach ($period_logs_raw) {
      each as $log {
        var $include {
          value = true
        }
      
        conditional {
          if ($input.profile_id != null && $log.profile_id != $input.profile_id) {
            var.update $include {
              value = false
            }
          }
        }
      
        conditional {
          if ($input.bidder_id != null && $log.bidder_id != $input.bidder_id) {
            var.update $include {
              value = false
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
      }
    }
  
    // All-time totals
    db.query generation_log {
      return = {type: "list"}
    } as $all_logs
  
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
    all_time_total        : $all_time_total
    all_time_input_tokens : $all_time_input_tokens
    all_time_output_tokens: $all_time_output_tokens
  }
}