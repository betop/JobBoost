// Consumes one free resume generation from an admin's free trial (never below 0).
// Re-reads the admin right before writing so concurrent requests cannot drive it negative.
function "credits/consume_free_generation" {
  description = "Decrement users.free_generations_remaining by 1, floored at 0"

  input {
    uuid admin_id {
      description = "users.id of the billing admin"
    }
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.admin_id
    } as $admin

    var $remaining {
      value = $admin.free_generations_remaining|first_notnull:0
    }

    var $consumed {
      value = false
    }

    conditional {
      if ($remaining > 0) {
        var.update $remaining {
          value = $remaining - 1
        }

        db.patch users {
          field_name = "id"
          field_value = $input.admin_id
          data = {free_generations_remaining: $remaining}
        } as $_
        
        var.update $consumed {
          value = true
        }
      }
    }
  }

  response = {
    consumed : $consumed
    remaining: $remaining
  }

  guid = "cN5sUmEf8rEeGq4YtZp2Lw9KdJa"
}
