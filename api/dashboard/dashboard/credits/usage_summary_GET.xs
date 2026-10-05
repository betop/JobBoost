// Credit usage summary for a date range, grouped by app (resume generation / assistant / mail triage).
// Active admin: always their own usage (admin_id ignored).
// super_admin: pass admin_id for one admin, omit for all admins combined.
// Amounts are returned as positive "spent" values (usage rows are stored negative).
query "dashboard/credits/usage-summary" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
    text date_from? {
      description = "ISO timestamp, inclusive (required)"
    }

    text date_to? {
      description = "ISO timestamp, inclusive (required)"
    }

    uuid admin_id? {
      description = "super_admin only - restrict to one admin; omit for all admins"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && ($user.type == "super_admin" || $user.is_active)) {
      error_type = "accessdenied"
      error = "User not authorized"
    }

    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only admin or super_admin accounts can view credit usage"
    }

    precondition ($input.date_from != null && $input.date_from != "" && $input.date_to != null && $input.date_to != "") {
      error_type = "badrequest"
      error = "date_from and date_to are required (ISO timestamps)"
    }

    var $from_ms {
      value = null
    }

    var $to_ms {
      value = null
    }

    try_catch {
      try {
        var.update $from_ms {
          value = $input.date_from|to_ms
        }

        var.update $to_ms {
          value = $input.date_to|to_ms
        }
      }

      catch {
        var.update $from_ms {
          value = null
        }
      }
    }

    precondition ($from_ms != null && $to_ms != null) {
      error_type = "badrequest"
      error = "date_from and date_to must be valid ISO timestamps"
    }

    precondition ($to_ms >= $from_ms) {
      error_type = "badrequest"
      error = "date_to must be greater than or equal to date_from"
    }

    precondition (($to_ms - $from_ms) <= 8035200000) {
      error_type = "badrequest"
      error = "Date range must not exceed 93 days"
    }

    var $from_ts {
      value = $from_ms|to_timestamp
    }

    var $to_ts {
      value = $to_ms|to_timestamp
    }

    // active admin -> self; super_admin -> given admin_id, or null for all
    var $filter_admin_id {
      value = $user.id
    }

    conditional {
      if ($user.type == "super_admin") {
        var.update $filter_admin_id {
          value = $input.admin_id
        }
      }
    }

    var $gen_amount {
      value = 0
    }

    var $gen_count {
      value = 0
    }

    var $chat_amount {
      value = 0
    }

    var $chat_count {
      value = 0
    }

    var $mail_amount {
      value = 0
    }

    var $mail_count {
      value = 0
    }

    var $other_amount {
      value = 0
    }

    var $other_count {
      value = 0
    }

    var $gen_in {
      value = 0
    }

    var $gen_out {
      value = 0
    }

    var $gen_cw {
      value = 0
    }

    var $gen_cr {
      value = 0
    }

    var $gen_tracked {
      value = 0
    }

    var $chat_in {
      value = 0
    }

    var $chat_out {
      value = 0
    }

    var $chat_cw {
      value = 0
    }

    var $chat_cr {
      value = 0
    }

    var $chat_tracked {
      value = 0
    }

    var $mail_in {
      value = 0
    }

    var $mail_out {
      value = 0
    }

    var $mail_cw {
      value = 0
    }

    var $mail_cr {
      value = 0
    }

    var $mail_tracked {
      value = 0
    }

    var $other_in {
      value = 0
    }

    var $other_out {
      value = 0
    }

    var $other_cw {
      value = 0
    }

    var $other_cr {
      value = 0
    }

    var $other_tracked {
      value = 0
    }

    // Page through matching usage rows (1000 per page, hard cap 300 pages)
    foreach ((1..300)) {
      each as $page_no {
        db.query credit_transaction {
          where = $db.credit_transaction.type == "usage" && $db.credit_transaction.created_at >= $from_ts && $db.credit_transaction.created_at <= $to_ts && $db.credit_transaction.admin_id ==? $filter_admin_id
          sort = {credit_transaction.created_at: "asc"}
          return = {
            type: "list"
            paging: {page: $page_no, per_page: 1000, totals: false}
          }
        } as $page

        var $rows {
          value = $page.items
        }

        var $row_count {
          value = $rows|count
        }

        conditional {
          if ($row_count == 0) {
            break
          }
        }

        var $gen_rows {
          value = $rows|filter:$$.related_log_table == "generation_log"
        }

        var $chat_rows {
          value = $rows|filter:$$.related_log_table == "chat_log"
        }

        var $mail_rows {
          value = $rows|filter:$$.related_log_table == "mail_triage_log"
        }

        var $other_rows {
          value = $rows|filter:$$.related_log_table != "generation_log" && $$.related_log_table != "chat_log" && $$.related_log_table != "mail_triage_log"
        }

        var.update $gen_amount {
          value = $gen_amount + ($gen_rows|map:$$.amount|sum)
        }

        var.update $gen_count {
          value = $gen_count + ($gen_rows|count)
        }

        var.update $chat_amount {
          value = $chat_amount + ($chat_rows|map:$$.amount|sum)
        }

        var.update $chat_count {
          value = $chat_count + ($chat_rows|count)
        }

        var.update $mail_amount {
          value = $mail_amount + ($mail_rows|map:$$.amount|sum)
        }

        var.update $mail_count {
          value = $mail_count + ($mail_rows|count)
        }

        var.update $other_amount {
          value = $other_amount + ($other_rows|map:$$.amount|sum)
        }

        var.update $other_count {
          value = $other_count + ($other_rows|count)
        }

        var.update $gen_in {
          value = $gen_in + ($gen_rows|map:($$.input_tokens|first_notnull:0)|sum)
        }

        var.update $gen_out {
          value = $gen_out + ($gen_rows|map:($$.output_tokens|first_notnull:0)|sum)
        }

        var.update $gen_cw {
          value = $gen_cw + ($gen_rows|map:($$.cache_creation_tokens|first_notnull:0)|sum)
        }

        var.update $gen_cr {
          value = $gen_cr + ($gen_rows|map:($$.cache_read_tokens|first_notnull:0)|sum)
        }

        var.update $gen_tracked {
          value = $gen_tracked + ($gen_rows|filter:$$.input_tokens != null|count)
        }

        var.update $chat_in {
          value = $chat_in + ($chat_rows|map:($$.input_tokens|first_notnull:0)|sum)
        }

        var.update $chat_out {
          value = $chat_out + ($chat_rows|map:($$.output_tokens|first_notnull:0)|sum)
        }

        var.update $chat_cw {
          value = $chat_cw + ($chat_rows|map:($$.cache_creation_tokens|first_notnull:0)|sum)
        }

        var.update $chat_cr {
          value = $chat_cr + ($chat_rows|map:($$.cache_read_tokens|first_notnull:0)|sum)
        }

        var.update $chat_tracked {
          value = $chat_tracked + ($chat_rows|filter:$$.input_tokens != null|count)
        }

        var.update $mail_in {
          value = $mail_in + ($mail_rows|map:($$.input_tokens|first_notnull:0)|sum)
        }

        var.update $mail_out {
          value = $mail_out + ($mail_rows|map:($$.output_tokens|first_notnull:0)|sum)
        }

        var.update $mail_cw {
          value = $mail_cw + ($mail_rows|map:($$.cache_creation_tokens|first_notnull:0)|sum)
        }

        var.update $mail_cr {
          value = $mail_cr + ($mail_rows|map:($$.cache_read_tokens|first_notnull:0)|sum)
        }

        var.update $mail_tracked {
          value = $mail_tracked + ($mail_rows|filter:$$.input_tokens != null|count)
        }

        var.update $other_in {
          value = $other_in + ($other_rows|map:($$.input_tokens|first_notnull:0)|sum)
        }

        var.update $other_out {
          value = $other_out + ($other_rows|map:($$.output_tokens|first_notnull:0)|sum)
        }

        var.update $other_cw {
          value = $other_cw + ($other_rows|map:($$.cache_creation_tokens|first_notnull:0)|sum)
        }

        var.update $other_cr {
          value = $other_cr + ($other_rows|map:($$.cache_read_tokens|first_notnull:0)|sum)
        }

        var.update $other_tracked {
          value = $other_tracked + ($other_rows|filter:$$.input_tokens != null|count)
        }

        conditional {
          if ($row_count < 1000) {
            break
          }
        }
      }
    }

    function.run "ai/claude_haiku_rates" {
      input = {}
    } as $rates

    function.run "credits/get_usage_rate" {
      input = {}
    } as $rate_info

    // usage rows are negative -> spent = -amount. Token/raw_cost cover tracked rows only.
    var $by_app {
      value = [
      {
        key: "resume_generation"
        label: "Resume generations"
        amount: ((0 - $gen_amount)|round:6)
        count: $gen_count
        tracked_count: $gen_tracked
        untracked_count: ($gen_count - $gen_tracked)
        tokens: {input: $gen_in, output: $gen_out, cache_write: $gen_cw, cache_read: $gen_cr}
        raw_cost: {input: (($gen_in * $rates.input_per_million / 1000000)|round:6), output: (($gen_out * $rates.output_per_million / 1000000)|round:6), cache_write: (($gen_cw * $rates.cache_write_per_million / 1000000)|round:6), cache_read: (($gen_cr * $rates.cache_read_per_million / 1000000)|round:6), total: ((($gen_in * $rates.input_per_million) + ($gen_out * $rates.output_per_million) + ($gen_cw * $rates.cache_write_per_million) + ($gen_cr * $rates.cache_read_per_million)) / 1000000)|round:6}
      }
      {
        key: "assistant"
        label: "Assistant"
        amount: ((0 - $chat_amount)|round:6)
        count: $chat_count
        tracked_count: $chat_tracked
        untracked_count: ($chat_count - $chat_tracked)
        tokens: {input: $chat_in, output: $chat_out, cache_write: $chat_cw, cache_read: $chat_cr}
        raw_cost: {input: (($chat_in * $rates.input_per_million / 1000000)|round:6), output: (($chat_out * $rates.output_per_million / 1000000)|round:6), cache_write: (($chat_cw * $rates.cache_write_per_million / 1000000)|round:6), cache_read: (($chat_cr * $rates.cache_read_per_million / 1000000)|round:6), total: ((($chat_in * $rates.input_per_million) + ($chat_out * $rates.output_per_million) + ($chat_cw * $rates.cache_write_per_million) + ($chat_cr * $rates.cache_read_per_million)) / 1000000)|round:6}
      }
      {
        key: "mail_triage"
        label: "Mail triage"
        amount: ((0 - $mail_amount)|round:6)
        count: $mail_count
        tracked_count: $mail_tracked
        untracked_count: ($mail_count - $mail_tracked)
        tokens: {input: $mail_in, output: $mail_out, cache_write: $mail_cw, cache_read: $mail_cr}
        raw_cost: {input: (($mail_in * $rates.input_per_million / 1000000)|round:6), output: (($mail_out * $rates.output_per_million / 1000000)|round:6), cache_write: (($mail_cw * $rates.cache_write_per_million / 1000000)|round:6), cache_read: (($mail_cr * $rates.cache_read_per_million / 1000000)|round:6), total: ((($mail_in * $rates.input_per_million) + ($mail_out * $rates.output_per_million) + ($mail_cw * $rates.cache_write_per_million) + ($mail_cr * $rates.cache_read_per_million)) / 1000000)|round:6}
      }
      ]
    }

    conditional {
      if ($other_count > 0) {
        var.update $by_app {
          value = $by_app|push:      {
        key: "other"
        label: "Other"
        amount: ((0 - $other_amount)|round:6)
        count: $other_count
        tracked_count: $other_tracked
        untracked_count: ($other_count - $other_tracked)
        tokens: {input: $other_in, output: $other_out, cache_write: $other_cw, cache_read: $other_cr}
        raw_cost: {input: (($other_in * $rates.input_per_million / 1000000)|round:6), output: (($other_out * $rates.output_per_million / 1000000)|round:6), cache_write: (($other_cw * $rates.cache_write_per_million / 1000000)|round:6), cache_read: (($other_cr * $rates.cache_read_per_million / 1000000)|round:6), total: ((($other_in * $rates.input_per_million) + ($other_out * $rates.output_per_million) + ($other_cw * $rates.cache_write_per_million) + ($other_cr * $rates.cache_read_per_million)) / 1000000)|round:6}
      }
        }
      }
    }

    var $total_spent {
      value = (0 - ($gen_amount + $chat_amount + $mail_amount + $other_amount))|round:6
    }

    var $total_count {
      value = $gen_count + $chat_count + $mail_count + $other_count
    }

    var $t_in { value = $gen_in + $chat_in + $mail_in + $other_in }
    var $t_out { value = $gen_out + $chat_out + $mail_out + $other_out }
    var $t_cw { value = $gen_cw + $chat_cw + $mail_cw + $other_cw }
    var $t_cr { value = $gen_cr + $chat_cr + $mail_cr + $other_cr }
    var $t_tracked { value = $gen_tracked + $chat_tracked + $mail_tracked + $other_tracked }

    var $t_raw {
      value = {input: (($t_in * $rates.input_per_million / 1000000)|round:6), output: (($t_out * $rates.output_per_million / 1000000)|round:6), cache_write: (($t_cw * $rates.cache_write_per_million / 1000000)|round:6), cache_read: (($t_cr * $rates.cache_read_per_million / 1000000)|round:6), total: ((($t_in * $rates.input_per_million) + ($t_out * $rates.output_per_million) + ($t_cw * $rates.cache_write_per_million) + ($t_cr * $rates.cache_read_per_million)) / 1000000)|round:6}
    }
  }

  response = {
    date_from  : $input.date_from
    date_to    : $input.date_to
    admin_id   : $filter_admin_id
    total_spent: $total_spent
    total_count: $total_count
    by_app     : $by_app
    tokens     : {input: $t_in, output: $t_out, cache_write: $t_cw, cache_read: $t_cr}
    raw_cost   : $t_raw
    tracked_count: $t_tracked
    untracked_count: ($total_count - $t_tracked)
    pricing    : $rates
    usage_rate : $rate_info.usage_rate
  }
  guid = "GMGliYRAGbQFSjT9dqPvszA8tEc"
}
