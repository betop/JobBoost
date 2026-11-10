// Paginated list of crypto top-up deposits (crypto_deposit) with optional filters.
// admin: sees only their own deposits (admin_id input is ignored).
// super_admin: pass admin_id to filter one user, or omit it to see all.
// Never returns raw_webhook_payload or external_invoice_id.
// payment_url is only returned while the deposit is still pending.
// partially_paid deposits also return pay_address and crypto_remaining
// (amount_crypto - crypto_received, min 0) so the user can top up the same address.
query "dashboard/credits/deposits" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
    uuid admin_id? {
      description = "super_admin only - restrict to one user; omit for all"
    }

    text status? filters=trim {
      description = "pending | partially_paid | confirmed | failed | expired"
    }

    int page?=1
    int per_page?=25
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && ($user.type == "super_admin" || $user.is_active == true)) {
      error_type = "accessdenied"
      error = "User not authorized"
    }

    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only admin or super_admin accounts can view deposits"
    }

    // admin -> always self; super_admin -> given admin_id, or null for all
    var $filter_admin_id {
      value = $user.id
    }

    conditional {
      if ($user.type == "super_admin") {
        var.update $filter_admin_id {
          value = $input.admin_id
        }
      }
    }

    // empty status string -> no status filter
    var $filter_status {
      value = null
    }

    conditional {
      if ($input.status != null && $input.status != "") {
        var.update $filter_status {
          value = $input.status
        }
      }
    }

    // clamp paging inputs
    var $page {
      value = $input.page|first_notnull:1
    }

    conditional {
      if ($page < 1) {
        var.update $page {
          value = 1
        }
      }
    }

    var $per_page {
      value = $input.per_page|first_notnull:25
    }

    conditional {
      if ($per_page < 1) {
        var.update $per_page {
          value = 1
        }
      }
      elseif ($per_page > 100) {
        var.update $per_page {
          value = 100
        }
      }
    }

    // ==? skips the condition when the right-hand value is null
    db.query crypto_deposit {
      where = $db.crypto_deposit.admin_id ==? $filter_admin_id && $db.crypto_deposit.status ==? $filter_status
      sort = {crypto_deposit.created_at: "desc"}
      return = {
        type: "list"
        paging: {page: $page, per_page: $per_page, totals: true}
      }
    } as $results

    var $rows {
      value = $results.items|first_notnull:[]
    }

    // One db.get per distinct admin on the page (avoids per-row lookups)
    var $distinct_admin_ids {
      value = $rows|map:$$.admin_id|filter:$$ != null|unique
    }

    var $admin_names {
      value = {}
    }

    var $admin_emails {
      value = {}
    }

    foreach ($distinct_admin_ids) {
      each as $aid {
        db.get users {
          field_name = "id"
          field_value = $aid
        } as $au

        var $au_name {
          value = null
        }

        var $au_email {
          value = null
        }

        conditional {
          if ($au != null) {
            var.update $au_name {
              value = $au.full_name
            }

            var.update $au_email {
              value = $au.email
            }
          }
        }

        var.update $admin_names {
          value = $admin_names|set:$aid:$au_name
        }

        var.update $admin_emails {
          value = $admin_emails|set:$aid:$au_email
        }
      }
    }

    var $items {
      value = []
    }

    foreach ($rows) {
      each as $d {
        var $d_name {
          value = null
        }

        var $d_email {
          value = null
        }

        conditional {
          if ($d.admin_id != null) {
            var.update $d_name {
              value = $admin_names|get:$d.admin_id
            }

            var.update $d_email {
              value = $admin_emails|get:$d.admin_id
            }
          }
        }

        var $d_payment_url {
          value = null
        }

        conditional {
          if ($d.status == "pending") {
            var.update $d_payment_url {
              value = $d.payment_url
            }
          }
        }

        var $d_crypto_remaining {
          value = null
        }

        var $d_pay_address {
          value = null
        }

        conditional {
          if ($d.status == "partially_paid") {
            var.update $d_pay_address {
              value = $d.pay_address
            }

            conditional {
              if ($d.amount_crypto != null) {
                var $d_amount_crypto_dec {
                  value = $d.amount_crypto|to_decimal
                }

                var $d_received_dec {
                  value = $d.crypto_received|first_notnull:0|to_decimal
                }

                var $d_remaining_raw {
                  value = $d_amount_crypto_dec - $d_received_dec
                }

                var.update $d_crypto_remaining {
                  value = $d_remaining_raw|max:0
                }
              }
            }
          }
        }

        var $item {
          value = {}
            |set:"id":$d.id
            |set:"created_at":$d.created_at
            |set:"admin_id":$d.admin_id
            |set:"admin_name":$d_name
            |set:"admin_email":$d_email
            |set:"provider":$d.provider
            |set:"currency":$d.currency
            |set:"amount_usd":$d.amount_usd
            |set:"amount_crypto":$d.amount_crypto
            |set:"crypto_received":$d.crypto_received
            |set:"crypto_remaining":$d_crypto_remaining
            |set:"pay_address":$d_pay_address
            |set:"status":$d.status
            |set:"confirmed_at":$d.confirmed_at
            |set:"payment_url":$d_payment_url
        }

        array.push $items {
          value = $item
        }
      }
    }

    var $total {
      value = $results.itemsTotal|first_notnull:0
    }
  }

  response = {
    items   : $items
    page    : $page
    per_page: $per_page
    total   : $total
  }

  guid = "Qd7HvN2xLp9TrW4mKcY1sBjEoFa"
}
