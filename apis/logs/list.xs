// List generation logs with optional filters — v2
// Supports filtering by profile_id, bidder_id, date range, and period (week/month/today)
query "logs/list" verb=GET {
  api_group = "logs"
  auth = "admin"

  input {
    uuid profile_id?
    uuid bidder_id?
    timestamp date_from?
    timestamp date_to?
    text period?
    int is_matched?
  }

  stack {
    // Calculate date_from based on period if date_from not explicitly provided
    var $resolved_from {
      value = $input.date_from
    }
  
    var $resolved_to {
      value = $input.date_to
    }
  
    conditional {
      if ($input.period == "week" && $input.date_from == null) {
        var $neg_week {
          value = 0 - 604800
        }
      
        var.update $resolved_from {
          value = now|add_secs_to_timestamp:$neg_week
        }
      }
    
      elseif ($input.period == "month" && $input.date_from == null) {
        var $neg_month {
          value = 0 - 2592000
        }
      
        var.update $resolved_from {
          value = now|add_secs_to_timestamp:$neg_month
        }
      }
    
      elseif ($input.period == "today" && $input.date_from == null) {
        var $neg_day {
          value = 0 - 86400
        }
      
        var.update $resolved_from {
          value = now|add_secs_to_timestamp:$neg_day
        }
      }
    }
  
    // Query logs with date filters only — UUID filters applied below to avoid 22P02
    var $has_from {
      value = $resolved_from != null
    }
  
    var $has_to {
      value = $resolved_to != null
    }
  
    // Fetch: date range only in WHERE to avoid UUID cast errors
    db.query generation_log {
      where = (($has_from == false || $db.generation_log.created_at >= $resolved_from) && ($has_to == false || $db.generation_log.created_at <= $resolved_to))
      sort = {generation_log.created_at: "desc"}
      return = {type: "list"}
    } as $logs_prefetch
  
    // Post-filter by profile_id / bidder_id if provided
    var $logs_raw {
      value = []
    }
  
    foreach ($logs_prefetch) {
      each as $lr {
        var $lr_include {
          value = true
        }
      
        conditional {
          if ($input.profile_id != null && $lr.profile_id != $input.profile_id) {
            var.update $lr_include {
              value = false
            }
          }
        }
      
        conditional {
          if ($input.bidder_id != null && $lr.bidder_id != $input.bidder_id) {
            var.update $lr_include {
              value = false
            }
          }
        }
      
        conditional {
          if ($input.is_matched != null && $lr.is_matched != $input.is_matched) {
            var.update $lr_include {
              value = false
            }
          }
        }
      
        conditional {
          if ($lr_include) {
            var.update $logs_raw {
              value = $logs_raw|push:$lr
            }
          }
        }
      }
    }
  
    // Enrich each log with profile name and bidder name
    var $logs {
      value = []
    }
  
    var $total_input_tokens {
      value = 0
    }
  
    var $total_output_tokens {
      value = 0
    }
  
    var $total_count {
      value = 0
    }
  
    foreach ($logs_raw) {
      each as $log {
        var.update $total_count {
          value = $total_count + 1
        }
      
        // Accumulate token totals
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
      
        // Look up profile name
        var $profile_name {
          value = ""
        }
      
        conditional {
          if ($log.profile_id != null) {
            db.get profile {
              field_name = "id"
              field_value = $log.profile_id
            } as $p
          
            conditional {
              if ($p != null) {
                var.update $profile_name {
                  value = $p.full_name
                }
              }
            }
          }
        }
      
        // Look up bidder name
        var $bidder_name {
          value = ""
        }
      
        conditional {
          if ($log.bidder_id != null) {
            db.get bidder {
              field_name = "id"
              field_value = $log.bidder_id
            } as $b
          
            conditional {
              if ($b != null) {
                var.update $bidder_name {
                  value = $b.full_name
                }
              }
            }
          }
        }
      
        var $enriched {
          value = $log
            |set:"profile_name":$profile_name
            |set:"bidder_name":$bidder_name
            |set:"is_matched":$log.is_matched
            |set:"match_reason":$log.match_reason
        }
      
        var.update $logs {
          value = $logs|push:$enriched
        }
      }
    }
  }

  response = {
    items              : $logs
    total              : $total_count
    total_input_tokens : $total_input_tokens
    total_output_tokens: $total_output_tokens
  }
}