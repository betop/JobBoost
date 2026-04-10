// Deactivate a bidder (PATCH /bidders/:id/deactivate)
query "bidders/{id}/deactivate" verb=PATCH {
  api_group = "bidders"
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
      error = "Bidder not found"
    }
  
    db.patch users {
      field_name = "id"
      field_value = $b.id
      data = {is_active: false, updated_at: now}
    } as $updated_user
  }

  response = {success: true}
}