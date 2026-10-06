// Super-admin-only: list all admin accounts with their current credit balance.
// Used to populate the credits overview table in the admin panel.
query "dashboard/credits/admins" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $user

    precondition ($user != null && $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super_admin can list admin credit balances"
    }

    db.query users {
      where = $db.users.type == "admin" && ($db.users.deleted == false || $db.users.deleted == null)
      sort = {users.full_name: "asc"}
      return = {type: "list"}
    } as $admins

    var $results {
      value = []
    }

    foreach ($admins) {
      each as $a {
        // db.query on production does not return the newer free_generations_remaining column,
        // so re-read the row with db.get (which does) to get the complete record.
        db.get users {
          field_name = "id"
          field_value = $a.id
        } as $full

        var $free {
          value = $full.free_generations_remaining|first_notnull:0
        }

        var $bal {
          value = $full.credit_balance|first_notnull:0
        }

        var $item {
          value = {
            id: $full.id,
            full_name: $full.full_name,
            email: $full.email,
            is_active: $full.is_active,
            is_approved: $full.is_approved,
            credit_balance: $bal,
            free_generations_remaining: $free
          }
        }

        array.push $results {
          value = $item
        }
      }
    }
  }

  response = {items: $results}

  guid = "b8VsT2qYnR6pL4oMcWfXd1aJeKg"
}
