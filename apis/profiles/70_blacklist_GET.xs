// List all blacklisted companies (jobs at these companies are never generated for)
query blacklist verb=GET {
  api_group = "profiles"
  auth = "users"

  input {
  }

  stack {
    db.query blacklisted_company {
      sort = {blacklisted_company.name: "asc"}
      return = {type: "list"}
    } as $entries
  }

  response = $entries
}