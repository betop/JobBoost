// Returns the authenticated admin's current credit balance and recent transactions.
// super_admin can pass admin_id to inspect any admin's balance.
query "dashboard/credits/balance" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
    uuid admin_id? {
      description = "super_admin only — inspect a specific admin's balance"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && $user.is_active) {
      error_type = "accessdenied"
      error = "User not authorized"
    }

    precondition ($user.type == "admin" || $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only admin or super_admin accounts have a credit balance"
    }

    var $target_admin_id {
      value = $user.id
    }

    conditional {
      if ($user.type == "super_admin" && $input.admin_id != null) {
        var.update $target_admin_id {
          value = $input.admin_id
        }
      }
    }

    db.get users {
      field_name = "id"
      field_value = $target_admin_id
    } as $target_admin

    precondition ($target_admin != null) {
      error_type = "notfound"
      error = "Admin not found"
    }

    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $target_admin_id
      sort = {credit_transaction.created_at: "desc"}
      return = {
        type: "list"
        paging: {page: 1, per_page: 20, totals: false}
      }
    } as $recent_transactions_paged

    var $recent_transactions {
      value = $recent_transactions_paged.items
    }
  }

  response = {
    admin_id          : $target_admin.id
    credit_balance     : $target_admin.credit_balance|first_notnull:0
    free_generations_remaining: $target_admin.free_generations_remaining|first_notnull:0
    recent_transactions: $recent_transactions
  }

  guid = "f6YsU3qXoT9pL2vNcZmBd8rAeWj"
}
