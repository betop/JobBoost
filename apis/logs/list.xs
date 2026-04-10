// List generation logs — lightweight version
// Returns raw logs without enrichment (name lookups done client-side)
// NOTE: Frontend always sends explicit date_from/date_to in EST.
//       The period fallback below is kept only as a safety net.
query "logs/list" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    uuid profile_id?
    uuid bidder_id?
    timestamp date_from?
    timestamp date_to?
    text period?
    int is_matched?
    int page?=1
    int per_page?=100
  }

  stack {
    // Use explicit date_from/date_to from frontend (always EST-aligned)
    // Period fallback: only triggers when frontend doesn't send dates
    var $resolved_from {
      value = $input.date_from
    }
  
    var $resolved_to {
      value = $input.date_to
    }
  
    conditional {
      if ($input.period == "today" && $input.date_from == null) {
        // Start of current calendar day in server-local time (UTC)
        // Frontend should always send the correct EST timestamps instead
        var.update $resolved_from {
          value = now
            |transform_timestamp:"today midnight"
        }
      }
    }
  
    var $has_from {
      value = $resolved_from != null
    }
  
    var $has_to {
      value = $resolved_to != null
    }
  
    // Fetch logs with pagination
    db.query generation_log {
      where = (($has_from == false || $db.generation_log.created_at >= $resolved_from) && ($has_to == false || $db.generation_log.created_at <= $resolved_to))
      sort = {generation_log.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.per_page}
      }
    } as $logs
  }

  response = {
    items      : $logs.items
    total_count: $logs.itemsReceived
    cur_page   : $logs.curPage
    next_page  : $logs.nextPage
    prev_page  : $logs.prevPage
    per_page   : $logs.perPage
  }
}