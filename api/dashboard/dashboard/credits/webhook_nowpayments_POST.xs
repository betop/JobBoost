// Public IPN receiver for NOWPayments payment status callbacks.
// Does NOT trust the callback body for crediting: it takes only the payment_id and
// re-fetches the payment from NOWPayments (server-to-server, our API key), then credits
// the matching deposit only when that authoritative status is "finished".
// Repeated deposits (parent_payment_id set) and underpriced payments are never auto-credited.
// Always acknowledges with HTTP 200 (never throws) so NOWPayments does not keep retrying.
// After a deposit is credited it auto-withdraws to the owner's wallet via
// credits/provider_nowpayments_payout (best effort, failures only recorded under
// raw_webhook_payload.payout, never affecting the credit/outcome). Extra env vars:
// NOWPAYMENTS_EMAIL, NOWPAYMENTS_PASSWORD, NOWPAYMENTS_PAYOUT_ADDRESS (USDT BEP20), and
// NOWPAYMENTS_PAYOUT_2FA_SECRET (base32 authenticator secret; used to auto-verify the payout
// via credits/totp_generate, without it payouts stay pending until verified in the dashboard).
// The Xano outbound IP must be whitelisted in NOWPayments for the Payout API.
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

    var $error_detail {
      value = null
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

            var.update $error_detail {
              value = "s1"
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

            var.update $error_detail {
              value = "s2"
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
                var.update $error_detail {
              value = "s3"
            }

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

                    var.update $error_detail {
              value = "s4"
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

                    var $confirm_payload {
                      value = {
                        payment_id               : $input.payment_id
                        invoice_id               : $input.invoice_id
                        order_id                 : $input.order_id
                        payment_status           : $input.payment_status
                        verified_pay_currency    : $payment.pay_currency
                        verified_outcome_currency: $payment.outcome_currency
                        verified_outcome_amount  : $payment.outcome_amount
                      }
                    }

                    // Mark confirmed FIRST so a failure later can never lead to a double credit
                    db.patch crypto_deposit {
                      field_name = "id"
                      field_value = $deposit.id
                      data = {
                        status             : "confirmed"
                        confirmed_at        : now
                        raw_webhook_payload: $confirm_payload
                      }
                    } as $_

                    var.update $error_detail {
                      value = "after_confirm_patch"
                    }

                    db.patch users {
                      field_name = "id"
                      field_value = $deposit.admin_id
                      data = {credit_balance: $new_balance}
                    } as $_

                    var.update $error_detail {
                      value = "after_users_patch"
                    }

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

                        // Pay out exactly what was settled to custody, in the settled coin
                        conditional {
                          if ($outcome_currency_normalized != "" && $payment.outcome_amount != null && ($payment.outcome_amount|to_decimal) > 0) {
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

            var.update $error_detail {
              value = {stage: $error_detail, err: $error}
            }

            var.update $outcome {
              value = "error"
            }
          }
        }
      }
    }
  }

  response = {received: true, outcome: $outcome, error_detail: $error_detail}

  guid = "Xd5KvT2pQnM8wR3oZlBsYc7HjFa"
}
