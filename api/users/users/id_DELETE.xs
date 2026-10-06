// Soft-delete user: row is kept (so logs can still show the name), flagged deleted + inactive; access keys are removed
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
  
    precondition ($b.type != "super_admin") {
      error_type = "badrequest"
      error = "Super admin accounts cannot be deleted"
    }
  
    precondition ($b.id != $auth.id) {
      error_type = "badrequest"
      error = "You cannot delete your own account"
    }
  
    // Delete associated tokens
    db.query access_token {
      where = $db.access_token.user_id == $input.id
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
  
    db.patch users {
      field_name = "id"
      field_value = $input.id
      data = {deleted: true, is_active: false, updated_at: now}
    } as $_
  }

  response = {success: true}
  guid = "k1inZmZ654GWNw1jv8dyCwhdx_E"
}