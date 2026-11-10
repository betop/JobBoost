// Safety net for lost / never-sent NOWPayments IPNs. Every 10 minutes it re-checks pending and
// partially_paid NOWPayments deposits from the last 7 days through
// credits/process_nowpayments_payment (same verification and crediting rules as the webhook,
// and an already confirmed deposit is never credited twice). A partially_paid deposit is
// re-checked through its original payment, which may since have become "finished".
// The payment_id comes from crypto_deposit.payment_id, falling back to
// raw_webhook_payload.payment_id (older rows). Deposits without one are skipped, and a
// PENDING one is marked "expired" once older than 2 days (partially_paid is never expired).
// An "expired" deposit is still credited if a later "finished" IPN arrives.
task "reconcile_nowpayments_deposits" {
  description = "Re-check pending / partially_paid NOWPayments deposits and credit the ones that are finished"

  stack {
    var $since {
      value = now|transform_timestamp:"-7 days":"UTC"
    }

    var $expire_before {
      value = now|transform_timestamp:"-2 days":"UTC"
    }

    db.query crypto_deposit {
      where = $db.crypto_deposit.provider == "nowpayments" && ($db.crypto_deposit.status == "pending" || $db.crypto_deposit.status == "partially_paid") && $db.crypto_deposit.created_at >= $since
      sort = {crypto_deposit.created_at: "asc"}
      return = {
        type: "list"
        paging: {page: 1, per_page: 100}
      }
    } as $pending_page

    var $pending {
      value = $pending_page.items|first_notnull:[]
    }

    var $checked_count {
      value = 0
    }

    var $expired_count {
      value = 0
    }

    var $error_count {
      value = 0
    }

    foreach ($pending) {
      each as $d {
        try_catch {
          try {
            var $raw {
              value = $d.raw_webhook_payload|first_notnull:{}
            }

            var $raw_payment_id {
              value = $raw|get:"payment_id":null
            }

            // Prefer the payment_id column, fall back to the stored IPN payload
            var $payment_id {
              value = ($d.payment_id|to_text|first_notnull:"")|trim
            }

            conditional {
              if ($payment_id == "" && $raw_payment_id != null) {
                var.update $payment_id {
                  value = ($raw_payment_id|to_text|first_notnull:"")|trim
                }
              }
            }

            conditional {
              if ($payment_id != "") {
                var $raw_invoice_id {
                  value = $raw|get:"invoice_id":null
                }

                var $raw_order_id {
                  value = $raw|get:"order_id":null
                }

                var $raw_status {
                  value = $raw|get:"payment_status":null
                }

                function.run "credits/process_nowpayments_payment" {
                  input = {
                    payment_id     : $payment_id
                    invoice_id     : $raw_invoice_id
                    order_id       : $raw_order_id
                    callback_status: $raw_status
                  }
                } as $result

                var.update $checked_count {
                  value = $checked_count + 1
                }

                conditional {
                  if ($result.outcome == "error") {
                    var.update $error_count {
                      value = $error_count + 1
                    }

                    debug.log {
                      value = "NOWPayments reconcile error for deposit " ~ ($d.id|to_text) ~ ": " ~ ($result.error_detail|json_encode)
                    }
                  }
                }
              }

              elseif ($d.status == "pending" && $d.created_at < $expire_before) {
                // Never paid (no IPN / payment_id after 2 days)
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $d.id
                  data = {status: "expired"}
                } as $_

                var.update $expired_count {
                  value = $expired_count + 1
                }
              }
            }
          }

          catch {
            var.update $error_count {
              value = $error_count + 1
            }

            debug.log {
              value = "NOWPayments reconcile failed for deposit " ~ ($d.id|to_text) ~ ": " ~ $error
            }
          }
        }
      }
    }

    debug.log {
      value = "NOWPayments reconcile: checked " ~ ($checked_count|to_text) ~ ", expired " ~ ($expired_count|to_text) ~ ", errors " ~ ($error_count|to_text)
    }
  }

  schedule = [{starts_on: 2026-11-10 00:00:00+0000, freq: 600}]

  guid = "Tq6NvR2pWxK8mL4oZcBsYe5HjFd"
}
