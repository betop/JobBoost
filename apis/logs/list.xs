//  List generation logs — lightweight version
//  Returns raw logs without enrichment (name lookups done client-side)
// 
//  Two modes:
//   1. Full fetch:  send date_from / date_to  → returns all logs in that date range (paginated)
//   2. Delta fetch: send updated_since        → returns ALL records touched since that timestamp
//                   (created_at OR updated_at >= updated_since), no date range filter, no page limit
// 
//  Frontend always sends EST-aligned timestamps for date_from/date_to.
query "logs/list" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    timestamp date_from?
    timestamp date_to?
    timestamp updated_since?
    int page?=1
    int per_page?=1000
  }

  stack {
    var $is_delta {
      value = $input.updated_since != null
    }
  
    var $has_from {
      value = $input.date_from != null
    }
  
    var $has_to {
      value = $input.date_to != null
    }
  
    conditional {
      // ── Delta mode: return everything touched since updated_since ──
      if ($is_delta) {
        db.query generation_log {
          where = ($db.generation_log.created_at >= $input.updated_since || $db.generation_log.updated_at >= $input.updated_since)
          sort = {generation_log.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.per_page}
          }
        } as $logs
      }
    
      // ── Full fetch mode: filter by date range ──
      else {
        db.query generation_log {
          where = (($has_from == false || $db.generation_log.created_at >= $input.date_from) && ($has_to == false || $db.generation_log.created_at <= $input.date_to))
          sort = {generation_log.created_at: "desc"}
          return = {
            type  : "list"
            paging: {page: $input.page, per_page: $input.per_page}
          }
        } as $logs
      }
    }
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