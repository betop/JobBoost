// Paginated credit transaction ledger with optional filters.
// admin: sees only their own ledger. super_admin: can filter by any admin_id or see all.
query "dashboard/credits/transactions" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
    uuid admin_id?
    text type? {
      description = "deposit | usage | adjustment"
    }

    int page?=1
    int per_page?=25
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
      error = "Only admin or super_admin accounts can view credit transactions"
    }

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

    conditional {
      if ($filter_admin_id != null) {
        conditional {
          if ($input.type != null) {
            db.query credit_transaction {
              where = $db.credit_transaction.admin_id == $filter_admin_id && $db.credit_transaction.type == $input.type
              sort = {credit_transaction.created_at: "desc"}
              return = {
                type: "list"
                paging: {page: $input.page, per_page: $input.per_page, totals: true}
              }
            } as $results
          }

          else {
            db.query credit_transaction {
              where = $db.credit_transaction.admin_id == $filter_admin_id
              sort = {credit_transaction.created_at: "desc"}
              return = {
                type: "list"
                paging: {page: $input.page, per_page: $input.per_page, totals: true}
              }
            } as $results
          }
        }
      }

      else {
        // super_admin viewing all admins — only reachable when admin_id was omitted
        conditional {
          if ($input.type != null) {
            db.query credit_transaction {
              where = $db.credit_transaction.type == $input.type
              sort = {credit_transaction.created_at: "desc"}
              return = {
                type: "list"
                paging: {page: $input.page, per_page: $input.per_page, totals: true}
              }
            } as $results
          }

          else {
            db.query credit_transaction {
              sort = {credit_transaction.created_at: "desc"}
              return = {
                type: "list"
                paging: {page: $input.page, per_page: $input.per_page, totals: true}
              }
            } as $results
          }
        }
      }
    }
  }

  response = {items: $results.items}

  guid = "a2BdR7wPqM4sX1oLvZtFj5cKeYh"
}
