// Delete user (also removes associated tokens)
query "users/{id}" verb=DELETE {
  api_group = "users"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.id
    } as $b
  
    precondition ($b != null) {
      error_type = "notfound"
      error = "User not found"
    }
  
    // Delete associated tokens
    db.query access_token {
      where = $db.access_token.bidder_id == $input.id
      return = {type: "list"}
    } as $tokens
  
    foreach ($tokens) {
      each as $t {
        db.del access_token {
          field_name = "id"
          field_value = $t.id
        }
      }
    }
  
    db.del users {
      field_name = "id"
      field_value = $input.id
    }
  }

  response = {success: true}
}