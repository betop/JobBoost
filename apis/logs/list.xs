// List generation logs — lightweight version
// Returns raw logs without enrichment (name lookups done client-side)
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
  
    var $has_from {
      value = $resolved_from != null
    }
  
    var $has_to {
      value = $resolved_to != null
    }
  
    // Fetch logs — date range only in WHERE
    db.query generation_log {
      where = (($has_from == false || $db.generation_log.created_at >= $resolved_from) && ($has_to == false || $db.generation_log.created_at <= $resolved_to))
      sort = {generation_log.created_at: "desc"}
      return = {type: "list"}
    } as $logs
  }

  response = {items: $logs}
}