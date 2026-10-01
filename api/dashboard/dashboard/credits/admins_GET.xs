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

    precondition ($user != null && $user.is_active && $user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super_admin can list admin credit balances"
    }

    db.query users {
      where = $db.users.type == "admin"
      sort = {users.full_name: "asc"}
      return = {type: "list"}
    } as $admins

    var $results {
      value = []
    }

    foreach ($admins) {
      each as $a {
        array.push $results {
          value = {
            id            : $a.id
            full_name     : $a.full_name
            email         : $a.email
            is_active     : $a.is_active
            is_approved   : $a.is_approved
            credit_balance: $a.credit_balance|first_notnull:0
          }
        }
      }
    }
  }

  response = {items: $results}

  guid = "b8VsT2qYnR6pL4oMcWfXd1aJeKg"
}
