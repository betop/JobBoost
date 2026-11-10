// Public IPN receiver for NOWPayments payment status callbacks.
// Does NOT trust the callback body for crediting: it passes the payment_id to
// credits/process_nowpayments_payment, which re-fetches the payment from NOWPayments
// (server-to-server, our API key) and credits the matching deposit only when that
// authoritative status is "finished" (see that function for all rules, incl. auto-payout).
// The reconcile_nowpayments_deposits task re-runs the same function for pending deposits,
// so a lost or never-sent "finished" IPN still gets credited.
// Always acknowledges with HTTP 200 (never throws) so NOWPayments does not keep retrying.
// Payout env vars: NOWPAYMENTS_EMAIL, NOWPAYMENTS_PASSWORD, NOWPAYMENTS_PAYOUT_ADDRESS (USDT BEP20),
// NOWPAYMENTS_PAYOUT_2FA_SECRET. The Xano outbound IP must be whitelisted in NOWPayments for payouts.
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

    conditional {
      if ($input.payment_id == null || ($input.payment_id|to_text) == "") {
        var.update $outcome {
          value = "no_identifiers"
        }
      }

      else {
        try_catch {
          try {
            function.run "credits/process_nowpayments_payment" {
              input = {
                payment_id     : $input.payment_id
                invoice_id     : $input.invoice_id
                order_id       : $input.order_id
                callback_status: $input.payment_status
              }
            } as $result

            var.update $outcome {
              value = $result.outcome
            }

            var.update $error_detail {
              value = $result.error_detail
            }
          }

          catch {
            debug.log {
              value = "NOWPayments webhook processing error: " ~ $error
            }

            var.update $error_detail {
              value = {stage: "webhook", err: $error}
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
