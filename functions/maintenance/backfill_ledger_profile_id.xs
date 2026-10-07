// One-off backfill: fills credit_transaction.profile_id on existing usage ledger rows.
//   generation_log   -> generation_log.profile_id
//   chat_log         -> chat_log.log_id -> generation_log.profile_id
//   mail_triage_log  -> first profile whose email equals the log's gmail_email (trim + lowercase)
// Only rows of type "usage" with a null profile_id are touched, so it is idempotent.
// Rows whose log or profile no longer exists stay null.
// The ledger is paged in a stable created_at/id order over ALL usage rows (patching does not move rows between pages);
// profile_id is read with db.get because db.query may not return newly added columns.
// Pass dry_run=true (default) to only report what would change.
function "maintenance/backfill_ledger_profile_id" {
  description = "One-off: backfill credit_transaction.profile_id on usage ledger rows from their related logs"

  input {
    bool dry_run?=true
    int per_page?=200 {
      description = "Ledger rows processed per batch"
    }
  }

  stack {
    var $scanned { value = 0 }
    var $already_set { value = 0 }
    var $unknown_table { value = 0 }
    var $updated { value = 0 }
    var $counts {
      value = {
        generation_log : {found: 0, not_found: 0}
        chat_log       : {found: 0, not_found: 0}
        mail_triage_log: {found: 0, not_found: 0}
      }
    }
    var $sample { value = [] }
    var $done { value = false }
    var $page { value = 1 }

    for (2000) {
      each as $_iter {
        conditional {
          if (!$done) {
            db.query credit_transaction {
              where = $db.credit_transaction.type == "usage"
              sort = {credit_transaction.created_at: "asc", credit_transaction.id: "asc"}
              return = {type: "list", paging: {page: $page, per_page: $input.per_page, totals: false}}
            } as $batch

            conditional {
              if (($batch.items|count) < $input.per_page) {
                var.update $done { value = true }
              }
            }

            math.add $page { value = 1 }

            foreach ($batch.items) {
              each as $row {
                math.add $scanned { value = 1 }

                // Re-read the row so the (newly added) profile_id column is reliable
                db.get credit_transaction {
                  field_name = "id"
                  field_value = $row.id
                } as $tx

                var $tbl { value = $tx.related_log_table }
                var $resolved { value = null }
                var $known { value = true }

                conditional {
                  if ($tx.profile_id != null) {
                    var.update $known { value = false }
                    math.add $already_set { value = 1 }
                  }
                  elseif ($tbl != "generation_log" && $tbl != "chat_log" && $tbl != "mail_triage_log") {
                    var.update $known { value = false }
                    math.add $unknown_table { value = 1 }
                  }
                  elseif ($tx.related_log_id == null) {
                    // Log reference missing: counts as not found for its table
                    var.update $resolved { value = null }
                  }
                  elseif ($tbl == "generation_log") {
                    db.get generation_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $g
                    conditional {
                      if ($g != null) {
                        var.update $resolved { value = $g.profile_id }
                      }
                    }
                  }
                  elseif ($tbl == "chat_log") {
                    db.get chat_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $c
                    conditional {
                      if ($c != null && $c.log_id != null) {
                        db.get generation_log {
                          field_name = "id"
                          field_value = $c.log_id
                        } as $cg
                        conditional {
                          if ($cg != null) {
                            var.update $resolved { value = $cg.profile_id }
                          }
                        }
                      }
                    }
                  }
                  else {
                    db.get mail_triage_log {
                      field_name = "id"
                      field_value = $tx.related_log_id
                    } as $m
                    conditional {
                      if ($m != null && $m.gmail_email != null) {
                        var $mail_norm { value = $m.gmail_email|trim|to_lower }
                        conditional {
                          if ($mail_norm != "") {
                            db.query profile {
                              where = $db.profile.email == $mail_norm
                              sort = {profile.created_at: "asc"}
                              return = {type: "single"}
                            } as $mp
                            conditional {
                              if ($mp != null) {
                                var.update $resolved { value = $mp.id }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }

                conditional {
                  if ($known) {
                    // Verify the resolved profile still exists (a deleted profile stays null)
                    conditional {
                      if ($resolved != null) {
                        db.get profile {
                          field_name = "id"
                          field_value = $resolved
                        } as $pf
                        conditional {
                          if ($pf == null) {
                            var.update $resolved { value = null }
                          }
                        }
                      }
                    }

                    conditional {
                      if ($resolved != null) {
                        var.update $counts {
                          value = $counts|set:$tbl:(($counts|get:$tbl)|set:"found":((($counts|get:$tbl)|get:"found") + 1))
                        }

                        conditional {
                          if (!$input.dry_run) {
                            db.patch credit_transaction {
                              field_name = "id"
                              field_value = $tx.id
                              data = {profile_id: $resolved}
                            } as $_p
                          }
                        }

                        math.add $updated { value = 1 }

                        conditional {
                          if (($sample|count) < 5) {
                            array.push $sample {
                              value = {table: $tbl, ledger_id: $tx.id, profile_id: $resolved}
                            }
                          }
                        }
                      }
                      else {
                        var.update $counts {
                          value = $counts|set:$tbl:(($counts|get:$tbl)|set:"not_found":((($counts|get:$tbl)|get:"not_found") + 1))
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
    dry_run            : $input.dry_run
    ledger_rows_scanned: $scanned
    resolvable         : $updated
    by_table           : $counts
    already_has_profile: $already_set
    unknown_table      : $unknown_table
    sample             : $sample
  }
  guid = "Lg9LedgerProfileBackfillWq3Hd"
}
