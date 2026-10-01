// Public webhook receiver for 0xProcessing payment status callbacks.
// Verifies the HMAC signature, then on a "confirmed"/"completed" status credits
// the matching admin's credit_balance and logs a credit_transaction (type=deposit).
// Idempotent: re-confirms are ignored if the deposit is already "confirmed".
query "dashboard/credits/webhook" verb=POST {
  api_group = "dashboard"

  input {
    text merchant_order_id?
    text status?
    text id?
    json raw?
  }

  stack {
    // Xano auto-parses JSON bodies; reconstruct the raw text for signature
    // verification using the same encoding the provider used to sign.
    // Reconstruct the payload object from named inputs for signature verification
    // (Xano auto-parses the JSON body into $input.*, so we rebuild the text form).
    var $payload_obj {
      value = {
        merchant_order_id: $input.merchant_order_id
        status           : $input.status
        id               : $input.id
        raw              : $input.raw
      }
    }

    var $raw_body {
      value = $payload_obj|json_encode
    }

    var $signature {
      value = $request.headers|get:"x-signature"
    }

    function.run "credits/provider_0xprocessing_verify_webhook" {
      input = {
        raw_body : $raw_body
        signature: $signature
      }
    } as $verification

    precondition ($verification.is_valid) {
      error_type = "accessdenied"
      error = "Invalid webhook signature"
    }

    precondition ($input.merchant_order_id != null) {
      error_type = "badrequest"
      error = "merchant_order_id is required"
    }

    db.get crypto_deposit {
      field_name = "id"
      field_value = $input.merchant_order_id
    } as $deposit

    precondition ($deposit != null) {
      error_type = "notfound"
      error = "Deposit not found"
    }

    var $is_confirmed_status {
      value = $input.status == "confirmed" || $input.status == "completed" || $input.status == "paid"
    }

    conditional {
      if ($deposit.status == "confirmed") {
        // Already processed — ignore duplicate webhook delivery
      }

      elseif ($is_confirmed_status) {
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
            raw_webhook_payload: $input.raw
          }
        } as $_

        db.add credit_transaction {
          data = {
            admin_id         : $deposit.admin_id
            type              : "deposit"
            amount            : $deposit.amount_usd
            balance_after     : $new_balance
            related_deposit_id: $deposit.id
            note              : "USDT deposit confirmed (" ~ $deposit.currency ~ ")"
          }
        } as $_
      }

      else {
        db.patch crypto_deposit {
          field_name = "id"
          field_value = $deposit.id
          data = {
            status             : "failed"
            raw_webhook_payload: $input.raw
          }
        } as $_
      }
    }
  }

  response = {received: true}

  guid = "d3WvQ8pLmR5tN1oYsXaFj7cZeKb"
}
