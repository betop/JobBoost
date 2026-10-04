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
    text payment_id?
    text invoice_id?
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
        invoice_id    : $input.invoice_id
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

            var $verified_order_id {
              value = ($payment.order_id|to_text|first_notnull:"")|trim
            }

            var $verified_invoice_id {
              value = ($payment.invoice_id|to_text|first_notnull:"")|trim
            }

            var $callback_invoice_id {
              value = ($input.invoice_id|to_text|first_notnull:"")|trim
            }

            var $payment_status_normalized {
              value = ($payment.payment_status|to_text|first_notnull:"")|to_lower
            }

            var $outcome_currency_normalized {
              value = ($payment.outcome_currency|to_text|first_notnull:"")|to_lower
            }

            var $deposit {
              value = null
            }

            // Primary match: verified order_id (our crypto_deposit.id)
            conditional {
              if ($verified_order_id != "") {
                db.query crypto_deposit {
                  where = $db.crypto_deposit.id == $verified_order_id
                  return = {type: "single"}
                } as $deposit_by_order

                var.update $deposit {
                  value = $deposit_by_order
                }
              }
            }

            // Fallback: invoice id (preferred verified source, then callback source)
            conditional {
              if ($deposit == null && $verified_invoice_id != "") {
                db.query crypto_deposit {
                  where = $db.crypto_deposit.external_invoice_id == $verified_invoice_id
                  return = {type: "single"}
                } as $deposit_by_invoice

                var.update $deposit {
                  value = $deposit_by_invoice
                }
              }
            }

            conditional {
              if ($deposit == null && $callback_invoice_id != "") {
                db.query crypto_deposit {
                  where = $db.crypto_deposit.external_invoice_id == $callback_invoice_id
                  return = {type: "single"}
                } as $deposit_by_callback_invoice

                var.update $deposit {
                  value = $deposit_by_callback_invoice
                }
              }
            }

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

              elseif ($payment_status_normalized == "finished") {
                var $price_ok {
                  value = ($payment.price_currency|to_lower) == "usd" && ($payment.price_amount|to_decimal) >= $deposit.amount_usd
                }

                var $outcome_currency_ok {
                  value = true
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

                  elseif (!$outcome_currency_ok) {
                    var.update $outcome {
                      value = "outcome_currency_mismatch"
                    }
                  }

                  else {
                    var $credit_amount {
                      value = $deposit.amount_usd
                    }

                    conditional {
                      if ($credit_amount <= 0) {
                        var.update $credit_amount {
                          value = $deposit.amount_usd
                        }
                      }
                    }

                    db.get users {
                      field_name = "id"
                      field_value = $deposit.admin_id
                    } as $admin

                    var $current_balance {
                      value = $admin.credit_balance|first_notnull:0
                    }

                    var $new_balance {
                      value = $current_balance + $credit_amount
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
                          |set:"verified_pay_currency":$payment.pay_currency
                          |set:"verified_outcome_currency":$payment.outcome_currency
                          |set:"verified_outcome_amount":$payment.outcome_amount
                      }
                    } as $_

                    db.add credit_transaction {
                      data = {
                        admin_id         : $deposit.admin_id
                        type              : "deposit"
                        amount            : $credit_amount
                        balance_after     : $new_balance
                        related_deposit_id: $deposit.id
                        note              : "Deposit confirmed via NOWPayments (settled as USDT_BEP20)"
                      }
                    } as $_

                    var.update $outcome {
                      value = "confirmed"
                    }
                  }
                }
              }

              elseif ($payment_status_normalized == "failed" || $payment_status_normalized == "expired" || $payment_status_normalized == "refunded") {
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
                      |set:"verified_pay_currency":$payment.pay_currency
                      |set:"verified_outcome_currency":$payment.outcome_currency
                      |set:"verified_outcome_amount":$payment.outcome_amount
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
