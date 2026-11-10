// Processes one NOWPayments payment: shared by the IPN webhook (credits/webhook-nowpayments)
// and the reconcile task (reconcile_nowpayments_deposits).
// Does NOT trust callback data for crediting: it re-fetches the payment from NOWPayments
// (server-to-server, our API key) and credits the matching deposit only when that
// authoritative status is "finished" (normal payment, price check applies), or when the
// original payment was "partially_paid" and top-ups bring the received crypto to
// >= 99.5% of amount_crypto.
// Original payment (no parent_payment_id): its payment_id / pay_currency / pay_amount /
// pay_address are stored on the deposit (payment_id, currency, amount_crypto, pay_address).
// "partially_paid": deposit status "partially_paid", crypto_received = original actually_paid
// plus the top-ups already counted.
// Top-up (parent_payment_id set): matched by crypto_deposit.payment_id == parent_payment_id
// (fallback order_id / invoice). Counted only for a pending/partially_paid deposit, same
// pay_currency, and funds received (finished/confirmed/sending/partially_paid with
// actually_paid > 0). Counted child ids live in raw_webhook_payload.topups
// ([{payment_id, actually_paid}]) so a top-up is never counted twice. Any other repeated
// deposit is "repeated_deposit_skipped" (never auto-credited).
// Never throws: errors are returned as outcome "error" with error_detail {stage, err}.
// error_detail is null on every non-error path.
// After a deposit is credited it auto-withdraws to the owner's wallet via
// credits/provider_nowpayments_payout (best effort, failures only recorded under
// raw_webhook_payload.payout, never affecting the credit/outcome).
// raw_webhook_payload always keeps the ORIGINAL payment_id (the reconcile task falls back to it).
function "credits/process_nowpayments_payment" {
  description = "Verify a NOWPayments payment and confirm/fail/keep pending/partially_paid the matching crypto_deposit"

  input {
    text payment_id {
      description = "NOWPayments payment_id"
    }

    text invoice_id? {
      description = "Invoice id from the callback (fallback match only)"
    }

    text order_id? {
      description = "order_id from the callback (stored for diagnostics only)"
    }

    text callback_status? {
      description = "payment_status from the callback (stored for diagnostics only, never trusted)"
    }
  }

  stack {
    var $outcome {
      value = "ignored"
    }

    var $error_detail {
      value = null
    }

    var $stage {
      value = "start"
    }

    var $deposit_id {
      value = null
    }

    var $verified_status {
      value = null
    }

    var $payload_obj {
      value = {
        payment_id    : $input.payment_id
        invoice_id    : $input.invoice_id
        payment_status: $input.callback_status
        order_id      : $input.order_id
      }
    }

    try_catch {
      try {
        var.update $stage {
          value = "get_payment"
        }

        function.run "credits/provider_nowpayments_get_payment" {
          input = {payment_id: $input.payment_id|to_text}
        } as $payment

        var.update $verified_status {
          value = $payment.payment_status
        }

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

        var $pay_currency_normalized {
          value = ($payment.pay_currency|to_text|first_notnull:"")|to_lower
        }

        // This payment's own id (verified, falling back to the requested id)
        var $own_payment_id {
          value = ($payment.payment_id|to_text|first_notnull:"")|trim
        }

        conditional {
          if ($own_payment_id == "") {
            var.update $own_payment_id {
              value = ($input.payment_id|to_text|first_notnull:"")|trim
            }
          }
        }

        var $parent_payment_id {
          value = ($payment.parent_payment_id|to_text|first_notnull:"")|trim
        }

        var $has_parent {
          value = $parent_payment_id != "" && $parent_payment_id != "0"
        }

        var $actually_paid {
          value = $payment.actually_paid|first_notnull:0|to_decimal
        }

        var $pay_amount {
          value = null
        }

        conditional {
          if ($payment.pay_amount != null) {
            var.update $pay_amount {
              value = $payment.pay_amount|to_decimal
            }
          }
        }

        var.update $stage {
          value = "match_deposit"
        }

        var $deposit {
          value = null
        }

        // Top-up: match the deposit of the original payment
        conditional {
          if ($has_parent) {
            db.query crypto_deposit {
              where = $db.crypto_deposit.payment_id == $parent_payment_id
              return = {type: "single"}
            } as $deposit_by_parent

            var.update $deposit {
              value = $deposit_by_parent
            }
          }
        }

        // Primary match: verified order_id (our crypto_deposit.id)
        conditional {
          if ($deposit == null && $verified_order_id != "") {
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

        // Current deposit values (kept in sync with the payment-info patch below)
        var $deposit_amount_crypto {
          value = null
        }

        var $deposit_currency_normalized {
          value = ""
        }

        var $existing_raw {
          value = {}
        }

        var $existing_topups {
          value = []
        }

        conditional {
          if ($deposit != null) {
            var.update $deposit_id {
              value = $deposit.id
            }

            var.update $deposit_amount_crypto {
              value = $deposit.amount_crypto
            }

            var.update $deposit_currency_normalized {
              value = ($deposit.currency|to_text|first_notnull:"")|to_lower
            }

            var.update $existing_raw {
              value = $deposit.raw_webhook_payload|first_notnull:{}
            }

            var $existing_topups_raw {
              value = $existing_raw|get:"topups":null
            }

            var.update $existing_topups {
              value = $existing_topups_raw|first_notnull:[]
            }
          }
        }

        var $topups_received_raw {
          value = $existing_topups|map:($$.actually_paid|first_notnull:0|to_decimal)|sum
        }

        var $topups_received {
          value = $topups_received_raw|first_notnull:0|to_decimal
        }

        // Store the original payment's details on the deposit (first time, or a newer
        // funded payment for a still pending deposit)
        var.update $stage {
          value = "store_payment_info"
        }

        conditional {
          if ($deposit != null && $deposit.provider == "nowpayments" && !$has_parent && $own_payment_id != "" && $deposit.status != "confirmed") {
            var $stored_payment_id {
              value = ($deposit.payment_id|to_text|first_notnull:"")|trim
            }

            conditional {
              if ($stored_payment_id == "" || ($stored_payment_id != $own_payment_id && $deposit.status == "pending" && $actually_paid > 0)) {
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    payment_id   : $own_payment_id
                    currency     : $payment.pay_currency
                    amount_crypto: $pay_amount
                    pay_address  : $payment.pay_address
                  }
                } as $_

                var.update $deposit_amount_crypto {
                  value = $pay_amount
                }

                var.update $deposit_currency_normalized {
                  value = $pay_currency_normalized
                }
              }
            }
          }
        }

        var $amount_crypto_known {
          value = $deposit_amount_crypto != null && $deposit_amount_crypto > 0
        }

        var $completion_threshold {
          value = 0
        }

        conditional {
          if ($amount_crypto_known) {
            var.update $completion_threshold {
              value = ($deposit_amount_crypto|to_decimal) * 0.995
            }
          }
        }

        // Diagnosable payload for the pending/failed branches: callback fields + verified status
        var $checked_at {
          value = now
        }

        var $diag_payload {
          value = $payload_obj
            |set:"verified_payment_status":$payment.payment_status
            |set:"verified_actually_paid":$payment.actually_paid
            |set:"verified_pay_currency":$payment.pay_currency
            |set:"verified_price_amount":$payment.price_amount
            |set:"checked_at":$checked_at
            |set:"topups":$existing_topups
        }

        // Filled by the branch that decides to credit; the credit itself happens once below
        var $do_credit {
          value = false
        }

        var $credit_note {
          value = "Deposit confirmed via NOWPayments (settled as USDT_BEP20)"
        }

        var $confirm_payload {
          value = {}
        }

        var $confirm_crypto_received {
          value = null
        }

        var $payout_use_outcome {
          value = false
        }

        var.update $stage {
          value = "evaluate"
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

          elseif ($has_parent) {
            var.update $stage {
              value = "topup_checks"
            }

            var $deposit_open {
              value = $deposit.status == "partially_paid" || $deposit.status == "pending"
            }

            var $currency_match {
              value = $pay_currency_normalized != "" && $pay_currency_normalized == $deposit_currency_normalized
            }

            var $funds_statuses {
              value = ["finished", "confirmed", "sending", "partially_paid"]
            }

            var $waiting_statuses {
              value = ["waiting", "confirming"]
            }

            var $funds_received {
              value = $actually_paid > 0 && ($funds_statuses|in:$payment_status_normalized)
            }

            conditional {
              if (!$deposit_open || !$currency_match || !$amount_crypto_known) {
                // Re-deposit to an old address: needs manual review, never auto-credit
                var.update $outcome {
                  value = "repeated_deposit_skipped"
                }
              }

              elseif (!$funds_received) {
                conditional {
                  if ($waiting_statuses|in:$payment_status_normalized) {
                    var.update $outcome {
                      value = "topup_waiting"
                    }
                  }

                  else {
                    var.update $outcome {
                      value = "repeated_deposit_skipped"
                    }
                  }
                }
              }

              else {
                // Re-read: webhook and reconcile may process the same top-up concurrently
                db.get crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                } as $topup_fresh

                var $fresh_raw {
                  value = $topup_fresh.raw_webhook_payload|first_notnull:{}
                }

                var $fresh_topups_raw {
                  value = $fresh_raw|get:"topups":null
                }

                var $fresh_topups {
                  value = $fresh_topups_raw|first_notnull:[]
                }

                var $counted_ids {
                  value = $fresh_topups|map:($$.payment_id|to_text)
                }

                conditional {
                  if ($topup_fresh.status == "confirmed") {
                    var.update $outcome {
                      value = "already_confirmed"
                    }
                  }

                  elseif ($counted_ids|in:$own_payment_id) {
                    var.update $outcome {
                      value = "topup_already_counted"
                    }
                  }

                  else {
                    var $fresh_received {
                      value = $topup_fresh.crypto_received|first_notnull:0|to_decimal
                    }

                    var $new_total {
                      value = $fresh_received + $actually_paid
                    }

                    var $topup_entry {
                      value = {}
                        |set:"payment_id":$own_payment_id
                        |set:"actually_paid":$actually_paid
                    }

                    var $new_topups {
                      value = $fresh_topups
                    }

                    array.push $new_topups {
                      value = $topup_entry
                    }

                    var $topup_checked_at {
                      value = now
                    }

                    var $topup_payload {
                      value = $fresh_raw
                        |set:"topups":$new_topups
                        |set:"last_topup_payment_id":$own_payment_id
                        |set:"last_topup_status":$payment.payment_status
                        |set:"checked_at":$topup_checked_at
                    }

                    conditional {
                      if ($new_total >= $completion_threshold) {
                        var.update $do_credit {
                          value = true
                        }

                        var.update $credit_note {
                          value = "Deposit confirmed via NOWPayments after top-up (partially paid deposit completed)"
                        }

                        var.update $confirm_payload {
                          value = $topup_payload
                        }

                        var.update $confirm_crypto_received {
                          value = $new_total
                        }
                      }

                      else {
                        db.patch crypto_deposit {
                          field_name = "id"
                          field_value = $deposit.id
                          data = {
                            status             : "partially_paid"
                            crypto_received    : $new_total
                            raw_webhook_payload: $topup_payload
                          }
                        } as $_

                        var.update $outcome {
                          value = "topup_partial"
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          elseif ($payment_status_normalized == "finished") {
            var.update $stage {
              value = "finished_checks"
            }

            var $price_ok {
              value = ($payment.price_currency|to_lower) == "usd" && ($payment.price_amount|to_decimal) >= $deposit.amount_usd
            }

            var $outcome_currency_ok {
              value = true
            }

            conditional {
              if (!$price_ok) {
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
                var $finished_payload {
                  value = {
                    payment_id               : $input.payment_id
                    invoice_id               : $input.invoice_id
                    order_id                 : $input.order_id
                    payment_status           : $input.callback_status
                    verified_pay_currency    : $payment.pay_currency
                    verified_outcome_currency: $payment.outcome_currency
                    verified_outcome_amount  : $payment.outcome_amount
                  }
                }

                var.update $do_credit {
                  value = true
                }

                var.update $confirm_payload {
                  value = $finished_payload|set:"topups":$existing_topups
                }

                var.update $confirm_crypto_received {
                  value = $actually_paid + $topups_received
                }

                var.update $payout_use_outcome {
                  value = true
                }
              }
            }
          }

          elseif ($payment_status_normalized == "partially_paid") {
            var.update $stage {
              value = "partially_paid"
            }

            // Original payment underpaid: total = original actually_paid + counted top-ups
            var $pp_total {
              value = $actually_paid + $topups_received
            }

            var $topup_count {
              value = $existing_topups|count
            }

            conditional {
              if ($amount_crypto_known && $topup_count > 0 && $pp_total >= $completion_threshold) {
                // Top-ups were counted before this original payment was recorded
                var.update $do_credit {
                  value = true
                }

                var.update $credit_note {
                  value = "Deposit confirmed via NOWPayments after top-up (partially paid deposit completed)"
                }

                var.update $confirm_payload {
                  value = $diag_payload
                }

                var.update $confirm_crypto_received {
                  value = $pp_total
                }
              }

              else {
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    status             : "partially_paid"
                    crypto_received    : $pp_total
                    raw_webhook_payload: $diag_payload
                  }
                } as $_

                var.update $outcome {
                  value = "partially_paid"
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
                raw_webhook_payload: $diag_payload
              }
            } as $_

            var.update $outcome {
              value = "failed"
            }
          }

          else {
            // waiting / confirming / confirmed / sending: keep current status
            db.patch crypto_deposit {
              field_name = "id"
              field_value = $deposit.id
              data = {
                raw_webhook_payload: $diag_payload
              }
            } as $_

            var.update $outcome {
              value = "pending"
            }
          }
        }

        // Credit the FULL deposit amount_usd (normal finished payment or completed top-up)
        conditional {
          if ($do_credit) {
            var.update $stage {
              value = "credit_recheck"
            }

            var $credit_amount {
              value = $deposit.amount_usd
            }

            // Re-read right before crediting: the webhook and the reconcile task may
            // process the same payment at about the same time
            db.get crypto_deposit {
              field_name = "id"
              field_value = $deposit.id
            } as $deposit_fresh

            conditional {
              if ($deposit_fresh.status == "confirmed") {
                var.update $outcome {
                  value = "already_confirmed"
                }
              }

              else {
                var.update $stage {
                  value = "credit"
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

                // Mark confirmed FIRST so a failure later can never lead to a double credit
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    status             : "confirmed"
                    confirmed_at       : now
                    crypto_received    : $confirm_crypto_received
                    raw_webhook_payload: $confirm_payload
                  }
                } as $_

                var.update $stage {
                  value = "after_confirm_patch"
                }

                db.patch users {
                  field_name = "id"
                  field_value = $deposit.admin_id
                  data = {credit_balance: $new_balance}
                } as $_

                var.update $stage {
                  value = "after_users_patch"
                }

                db.add credit_transaction {
                  data = {
                    admin_id          : $deposit.admin_id
                    type              : "deposit"
                    amount            : $credit_amount
                    balance_after     : $new_balance
                    related_deposit_id: $deposit.id
                    note              : $credit_note
                  }
                } as $_

                var.update $stage {
                  value = "after_credit_transaction"
                }

                var.update $outcome {
                  value = "confirmed"
                }

                // Auto-withdraw to the owner's wallet. Credit is already saved: a payout
                // failure must never change the outcome, undo the credit, or throw.
                try_catch {
                  try {
                    var $payout_amount {
                      value = $deposit.amount_usd
                    }

                    var $payout_currency {
                      value = "usdtbsc"
                    }

                    // Normal payment: pay out exactly what was settled to custody, in the
                    // settled coin. Completed top-up: deposit amount in usdtbsc (best effort).
                    conditional {
                      if ($payout_use_outcome && $outcome_currency_normalized != "" && $payment.outcome_amount != null && ($payment.outcome_amount|to_decimal) > 0) {
                        var.update $payout_amount {
                          value = $payment.outcome_amount|to_decimal
                        }

                        var.update $payout_currency {
                          value = $outcome_currency_normalized
                        }
                      }
                    }

                    function.run "credits/provider_nowpayments_payout" {
                      input = {amount: $payout_amount, deposit_id: $deposit.id|to_text, currency: $payout_currency}
                    } as $payout

                    db.patch crypto_deposit {
                      field_name = "id"
                      field_value = $deposit.id
                      data = {
                        raw_webhook_payload: $confirm_payload|set:"payout":({payout_id: $payout.payout_id, status: $payout.status, verified: $payout.verified, detail: $payout.detail, amount: $payout_amount, currency: $payout_currency})
                      }
                    } as $_
                  }

                  catch {
                    debug.log {
                      value = "NOWPayments payout error: " ~ $error
                    }

                    try_catch {
                      try {
                        db.patch crypto_deposit {
                          field_name = "id"
                          field_value = $deposit.id
                          data = {
                            raw_webhook_payload: $confirm_payload|set:"payout":({status: "error", error: ($error|to_text)})
                          }
                        } as $_
                      }

                      catch {
                        debug.log {
                          value = "NOWPayments payout error record failed: " ~ $error
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

      catch {
        debug.log {
          value = "NOWPayments payment processing error at " ~ $stage ~ ": " ~ $error
        }

        var.update $error_detail {
          value = {stage: $stage, err: $error}
        }

        var.update $outcome {
          value = "error"
        }
      }
    }
  }

  response = {
    outcome        : $outcome
    deposit_id     : $deposit_id
    verified_status: $verified_status
    error_detail   : $error_detail
  }

  guid = "Pn7RkW3vQxM5tL9oZcBsYd2HjFg"
}
