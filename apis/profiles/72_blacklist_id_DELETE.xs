// Remove a company from the blacklist
query "blacklist/{id}" verb=DELETE {
  api_group = "profiles"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get blacklisted_company {
      field_name = "id"
      field_value = $input.id
    } as $entry
  
    precondition ($entry != null) {
      error_type = "notfound"
      error = "Blacklist entry not found"
    }
  
    db.del blacklisted_company {
      field_name = "id"
      field_value = $input.id
    }
  }

  response = {success: true}
}