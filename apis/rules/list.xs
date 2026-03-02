// List all rules
query rules verb=GET {
  api_group = "rules"
  auth = "admin"

  input {
  }

  stack {
    db.query rule {
      sort = {rule.created_at: "desc"}
      return = {type: "list"}
    } as $rules
  }

  response = $rules
}