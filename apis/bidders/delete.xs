// Delete bidder (also removes associated tokens)
query "bidders/{id}" verb=DELETE {
  api_group = "bidders"
  auth = "admin"

  input {
    uuid id?
  }

  stack {
    db.get bidder {
      field_name = "id"
      field_value = $input.id
    } as $b
  
    precondition ($b != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    db.query access_token {
      where = $db.access_token.bidder_id == $b.id
      return = {type: "list"}
    } as $token_list
  
    foreach ($token_list) {
      each as $t {
        db.del access_token {
          field_name = "id"
          field_value = $t.id
        }
      }
    }
  
    db.del bidder {
      field_name = "id"
      field_value = $b.id
    }
  }

  response = {success: true}
}