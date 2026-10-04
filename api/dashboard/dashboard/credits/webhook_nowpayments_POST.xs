// Public IPN receiver for NOWPayments payment status callbacks.
// Does NOT trust the callback body for crediting: it takes only the payment_id and
// re-fetches the payment from NOWPayments (server-to-server, our API key), then credits
// the matching deposit only when that authoritative status is "finished".
// Repeated deposits (parent_payment_id set) and underpriced payments are never auto-credited.
// Always acknowledges with HTTP 200 (never throws) so NOWPayments does not keep retrying.
// The callback URL is set per invoice in credits/deposit, no dashboard setting needed.
query "dashboard/credits/webhook-nowpayments" verb=POST {
  api_group = "dashboard"

  input {
    json payment_id?
    text payment_status?
    text order_id?
  }

  stack {
    var $outcome {
      value = "ignored"
    }

    var $payload_obj {
      value = {
        payment_id    : $input.payment_id
        payment_status: $input.payment_status
        order_id      : $input.order_id
      }
    }

    conditional {
      if ($input.payment_id == null || ($input.payment_id|to_text) == "") {
        var.update $outcome {
          value = "no_identifiers"
        }
      }

      else {
        try_catch {
          try {
            function.run "credits/provider_nowpayments_get_payment" {
              input = {payment_id: $input.payment_id|to_text}
            } as $payment

            // order_id is our crypto_deposit.id; a foreign/invalid value throws and
            // is caught below so it is acknowledged instead of erroring
            db.query crypto_deposit {
              where = $db.crypto_deposit.id == $payment.order_id
              return = {type: "single"}
            } as $deposit

            conditional {
              if ($deposit == null || $deposit.provider != "nowpayments") {
                var.update $outcome {
                  value = "unknown_deposit"
                }
              }

              elseif ($deposit.status == "confirmed") {
                var.update $outcome {
                  value = "already_confirmed"
                }
              }

              elseif ($payment.payment_status == "finished") {
                var $price_ok {
                  value = ($payment.price_currency|to_lower) == "usd" && ($payment.price_amount|to_decimal) >= $deposit.amount_usd
                }

                conditional {
                  if ($payment.parent_payment_id != null) {
                    // Re-deposit to an old address: needs manual review, never auto-credit
                    var.update $outcome {
                      value = "repeated_deposit_skipped"
                    }
                  }

                  elseif (!$price_ok) {
                    var.update $outcome {
                      value = "amount_mismatch"
                    }
                  }

                  else {
                    db.get users {
                      field_name = "id"
                      field_value = $deposit.admin_id
                    } as $admin

                    var $current_balance {
                      value = $admin.credit_balance|first_notnull:0
                    }

                    var $new_balance {
                      value = $current_balance + $deposit.amount_usd
                    }

                    db.patch users {
                      field_name = "id"
                      field_value = $deposit.admin_id
                      data = {credit_balance: $new_balance}
                    } as $_

                    db.patch crypto_deposit {
                      field_name = "id"
                      field_value = $deposit.id
                      data = {
                        status             : "confirmed"
                        confirmed_at        : now
                        raw_webhook_payload: $payload_obj
                      }
                    } as $_

                    db.add credit_transaction {
                      data = {
                        admin_id         : $deposit.admin_id
                        type              : "deposit"
                        amount            : $deposit.amount_usd
                        balance_after     : $new_balance
                        related_deposit_id: $deposit.id
                        note              : "USDT deposit confirmed via NOWPayments (" ~ $deposit.currency ~ ")"
                      }
                    } as $_

                    var.update $outcome {
                      value = "confirmed"
                    }
                  }
                }
              }

              elseif ($payment.payment_status == "failed" || $payment.payment_status == "expired" || $payment.payment_status == "refunded") {
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    status             : "failed"
                    raw_webhook_payload: $payload_obj
                  }
                } as $_

                var.update $outcome {
                  value = "failed"
                }
              }

              else {
                // waiting / confirming / confirmed / sending / partially_paid: keep pending
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    raw_webhook_payload: $payload_obj
                  }
                } as $_

                var.update $outcome {
                  value = "pending"
                }
              }
            }
          }

          catch {
            debug.log {
              value = "NOWPayments webhook processing error: " ~ $error
            }

            var.update $outcome {
              value = "error"
            }
          }
        }
      }
    }
  }

  response = {received: true, outcome: $outcome}

  guid = "Xd5KvT2pQnM8wR3oZlBsYc7HjFa"
}
