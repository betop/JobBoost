// Deactivate a bidder (PATCH /bidders/:id/deactivate)
query "bidders/{id}/deactivate" verb=PATCH {
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
  
    db.patch bidder {
      field_name = "id"
      field_value = $b.id
      data = {is_active: false, updated_at: now}
    }
  }

  response = {success: true}
}