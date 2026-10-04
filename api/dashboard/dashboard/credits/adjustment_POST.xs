// Super-admin-only: manually adjust an admin's credit balance (positive or negative),
// e.g. to correct an error, grant a bonus, or apply an off-platform payment.
query "dashboard/credits/adjustment" verb=POST {
  api_group = "dashboard"
  auth = "users"

  input {
    uuid admin_id {
      description = "users.id of the admin to adjust"
    }

    decimal amount {
      description = "Positive to credit, negative to debit"
    }

    text note? {
      description = "Reason for the manual adjustment"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super_admin can adjust credit balances"
    }

    precondition ($input.admin_id != null) {
      error_type = "badrequest"
      error = "admin_id is required"
    }

    precondition ($input.amount != null && $input.amount != 0) {
      error_type = "badrequest"
      error = "amount must be a non-zero number"
    }

    db.get users {
      field_name = "id"
      field_value = $input.admin_id
    } as $target_admin

    precondition ($target_admin != null && $target_admin.type == "admin") {
      error_type = "notfound"
      error = "Admin not found"
    }

    var $current_balance {
      value = $target_admin.credit_balance|first_notnull:0
    }

    var $new_balance {
      value = $current_balance + $input.amount
    }

    db.patch users {
      field_name = "id"
      field_value = $input.admin_id
      data = {credit_balance: $new_balance}
    } as $_

    db.add credit_transaction {
      data = {
        admin_id     : $input.admin_id
        type          : "adjustment"
        amount        : $input.amount
        balance_after : $new_balance
        note          : ($input.note|first_notnull:"Manual adjustment by super_admin") ~ " (by " ~ ($user.full_name|first_notnull:$user.id) ~ ")"
      }
    } as $txn
  }

  response = {
    admin_id   : $input.admin_id
    new_balance: $new_balance
    transaction: $txn
  }

  guid = "c4XwU6rZoS8qN2pLdVgTf3bKeMh"
}
