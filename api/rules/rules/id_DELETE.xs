// Delete a rule
query "rules/{id}" verb=DELETE {
  api_group = "rules"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get rule {
      field_name = "id"
      field_value = $input.id
    } as $r
  
    precondition ($r != null) {
      error_type = "notfound"
      error = "Rule not found"
    }
  
    db.del rule {
      field_name = "id"
      field_value = $r.id
    }
  }

  response = {success: true}
  guid = "5ybRpi4B13rQt0B68k34N5KSZT0"
}