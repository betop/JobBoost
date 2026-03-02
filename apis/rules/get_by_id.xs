// Get rule by id
query "rules/{id}" verb=GET {
  api_group = "rules"
  auth = "admin"

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
  }

  response = $r
}