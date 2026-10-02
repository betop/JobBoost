// Public webhook/IPN receiver for Paymento payment status callbacks.
// Does NOT trust the callback body for crediting — instead calls the Paymento
// Verify API (server-to-server, authenticated with our own API key) to get the
// authoritative order status before crediting, per Paymento's integration guide
// ("Always Verify Payments... to ensure the status update came from Paymento").
// Idempotent: re-confirms are ignored if the deposit is already "confirmed".
// IMPORTANT: always acknowledges with HTTP 200 (never throws), including for
// Paymento's dashboard "Test IPN" ping and any payload we can't fully process —
// unverifiable/incomplete events are logged and skipped rather than erroring,
// so a transient issue (e.g. verify API hiccup) can't fail Paymento's health check.
query "dashboard/credits/webhook" verb=POST {
  api_group = "dashboard"

  input {
    text Token?
    text PaymentId?
    text OrderId?
    int OrderStatus?
    json AdditionalData?
  }

  stack {
    var $payload_obj {
      value = {
        Token         : $input.Token
        PaymentId     : $input.PaymentId
        OrderId       : $input.OrderId
        OrderStatus   : $input.OrderStatus
        AdditionalData: $input.AdditionalData
      }
    }

    var $outcome { value = "ignored" }

    conditional {
      if ($input.Token == null) {
        // No usable identifiers (e.g. Paymento's dashboard connectivity/test ping) —
        // acknowledge receipt without attempting to process.
        var.update $outcome { value = "no_identifiers" }
      }

      else {
        // Lookup by Paymento token (external_invoice_id) to avoid UUID parsing
        // assumptions about OrderId format and to align with Paymento's canonical identifier.
        db.query crypto_deposit {
          where = $db.crypto_deposit.external_invoice_id == $input.Token
          return = {type: "single"}
        } as $deposit

        conditional {
          if ($deposit == null) {
            // Unknown order id — could be a test payload or a deposit from a
            // different environment. Log and acknowledge, don't error.
            var.update $outcome { value = "unknown_deposit" }
          }

          elseif ($deposit.status == "confirmed") {
            // Already processed — ignore duplicate webhook delivery
            var.update $outcome { value = "already_confirmed" }
          }

          else {
            // Always re-verify with Paymento directly rather than trusting the
            // callback body alone, per Paymento's integration guidance.
            // Wrapped in try_catch so a transient failure on their verify API
            // never turns into a 500 for this endpoint.
            try_catch {
              try {
                function.run "credits/provider_paymento_verify_payment" {
                  input = {token: $input.Token}
                } as $verify_result

                // orderStatus 7 = Paid (on-chain confirmed), 8 = Approve (verified by store)
                var $is_confirmed_status {
                  value = $verify_result.order_status == "7" || $verify_result.order_status == "8" || $verify_result.order_status == 7 || $verify_result.order_status == 8
                }

                conditional {
                  if ($is_confirmed_status) {
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
                        note              : "USDT deposit confirmed via Paymento (" ~ $deposit.currency ~ ")"
                      }
                    } as $_

                    var.update $outcome { value = "confirmed" }
                  }

                  elseif ($input.OrderStatus == 4 || $input.OrderStatus == 5 || $input.OrderStatus == 9) {
                    db.patch crypto_deposit {
                      field_name = "id"
                      field_value = $deposit.id
                      data = {
                        status             : "failed"
                        raw_webhook_payload: $payload_obj
                      }
                    } as $_

                    var.update $outcome { value = "failed" }
                  }

                  else {
                    // Intermediate status (Pending/PartialPaid/WaitingToConfirm) — just log it
                    db.patch crypto_deposit {
                      field_name = "id"
                      field_value = $deposit.id
                      data = {
                        raw_webhook_payload: $payload_obj
                      }
                    } as $_

                    var.update $outcome { value = "pending" }
                  }
                }
              }
              catch {
                // Verify API call itself failed (network hiccup, bad API key, etc.) —
                // log the raw payload for later reconciliation but still ack the IPN.
                db.patch crypto_deposit {
                  field_name = "id"
                  field_value = $deposit.id
                  data = {
                    raw_webhook_payload: $payload_obj
                  }
                } as $_

                var.update $outcome { value = "verify_error" }
              }
            }
          }
        }
      }
    }
  }

  response = {received: true, outcome: $outcome}

  guid = "d3WvQ8pLmR5tN1oYsXaFj7cZeKb"
}
