// One-off backfill: stores usage_rate / charged_amount / billing_admin_id on existing AI usage logs
// (generation_log, chat_log, mail_triage_log) from the matching credit_transaction ledger row
// (related_log_table + related_log_id, type "usage").
// Rate used per log: the ledger row's usage_rate; else amount / raw cost computed from the log's tokens
// (when computable); else 1.5 (the fixed rate before the setting existed).
// charged_amount = the ledger charge as a positive number; billing_admin_id = ledger admin_id.
// Logs without a ledger row (never billed) are left untouched. Logs that already have a usage_rate are skipped,
// so the function is idempotent. Pass dry_run=true to only report what would change.
function "maintenance/backfill_log_usage_rate" {
  description = "One-off: backfill usage_rate/charged_amount/billing_admin_id on AI usage logs from the ledger"

  input {
    bool dry_run?
    int per_page?=200 {
      description = "Ledger rows processed per batch"
    }
  }

  stack {
    var $scanned { value = 0 }
    var $updated { value = 0 }
    var $skipped_has_rate { value = 0 }
    var $skipped_no_log { value = 0 }
    var $rate_from_ledger { value = 0 }
    var $rate_from_tokens { value = 0 }
    var $rate_default { value = 0 }
    var $by_table { value = {generation_log: 0, chat_log: 0, mail_triage_log: 0} }
    var $sample { value = [] }
    var $done { value = false }
    var $page { value = 1 }

    for (1000) {
      each as $_iter {
        conditional {
          if (!$done) {
            db.query credit_transaction {
              where = $db.credit_transaction.type == "usage" && $db.credit_transaction.related_log_id != null
              sort = {credit_transaction.created_at: "asc"}
              return = {type: "list", paging: {page: $page, per_page: $input.per_page}}
            } as $batch

            conditional {
              if (($batch.items|count) < $input.per_page) {
                var.update $done { value = true }
              }
            }

            math.add $page { value = 1 }

            foreach ($batch.items) {
              each as $tx {
                var $tbl { value = $tx.related_log_table }
                var $lg { value = null }

                conditional {
                  if ($tbl == "generation_log") {
                    db.get generation_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $g
                    var.update $lg { value = $g }
                  }
                  elseif ($tbl == "chat_log") {
                    db.get chat_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $c
                    var.update $lg { value = $c }
                  }
                  elseif ($tbl == "mail_triage_log") {
                    db.get mail_triage_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $m
                    var.update $lg { value = $m }
                  }
                }

                math.add $scanned { value = 1 }

                conditional {
                  if ($lg == null) {
                    math.add $skipped_no_log { value = 1 }
                  }
                  elseif ($lg.usage_rate != null) {
                    math.add $skipped_has_rate { value = 1 }
                  }
                  else {
                    var $charged { value = 0 - ($tx.amount|first_notnull:0) }
                    var $rate { value = 1.5 }
                    var $source { value = "default" }

                    conditional {
                      if ($tx.usage_rate != null && $tx.usage_rate > 0) {
                        var.update $rate { value = $tx.usage_rate }
                        var.update $source { value = "ledger" }
                      }
                      elseif ($charged > 0 && $lg.input_tokens != null) {
                        function.run "ai/claude_haiku_cost" {
                          input = {
                            input_tokens         : $lg.input_tokens|first_notnull:0
                            output_tokens        : $lg.output_tokens|first_notnull:0
                            cache_creation_tokens: $lg.cache_creation_input_tokens|first_notnull:0
                            cache_read_tokens    : $lg.cache_read_input_tokens|first_notnull:0
                          }
                        } as $bf_raw

                        conditional {
                          if ($bf_raw > 0) {
                            // Ledger amounts only keep 5 decimals: if the charge matches raw x 1.5 within that rounding, the rate was 1.5
                            var.update $rate { value = ($charged / $bf_raw)|round:4 }

                            conditional {
                              if ((($charged - ($bf_raw * 1.5))|abs) <= 0.000006) {
                                var.update $rate { value = 1.5 }
                              }
                            }

                            var.update $source { value = "tokens" }
                          }
                        }
                      }
                    }

                    conditional {
                      if ($source == "ledger") {
                        math.add $rate_from_ledger { value = 1 }
                      }
                      elseif ($source == "tokens") {
                        math.add $rate_from_tokens { value = 1 }
                      }
                      else {
                        math.add $rate_default { value = 1 }
                      }
                    }

                    conditional {
                      if (!$input.dry_run) {
                        conditional {
                          if ($tbl == "generation_log") {
                            db.patch generation_log {
                              field_name = "id"
                              field_value = $lg.id
                              data = {usage_rate: $rate, charged_amount: $charged, billing_admin_id: $tx.admin_id}
                            } as $_p1
                          }
                          elseif ($tbl == "chat_log") {
                            db.patch chat_log {
                              field_name = "id"
                              field_value = $lg.id
                              data = {usage_rate: $rate, charged_amount: $charged, billing_admin_id: $tx.admin_id}
                            } as $_p2
                          }
                          else {
                            db.patch mail_triage_log {
                              field_name = "id"
                              field_value = $lg.id
                              data = {usage_rate: $rate, charged_amount: $charged, billing_admin_id: $tx.admin_id}
                            } as $_p3
                          }
                        }
                      }
                    }

                    math.add $updated { value = 1 }
                    var.update $by_table { value = $by_table|set:$tbl:(($by_table|get:$tbl) + 1) }

                    conditional {
                      if (($sample|count) < 5) {
                        array.push $sample {
                          value = {table: $tbl, log_id: $lg.id, usage_rate: $rate, charged_amount: $charged, source: $source}
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
  }

  response = {
    dry_run         : $input.dry_run
    ledger_rows_scanned: $scanned
    logs_updated    : $updated
    by_table        : $by_table
    rate_from_ledger: $rate_from_ledger
    rate_from_tokens: $rate_from_tokens
    rate_default    : $rate_default
    skipped_already_has_rate: $skipped_has_rate
    skipped_log_missing: $skipped_no_log
    sample          : $sample
  }
  guid = "Bf3LogUsageRateBackfillQ9xKd"
}
