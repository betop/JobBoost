// Throws accessdenied unless the user is an active super_admin. Returns the user row.
function "extension/assert_super_admin" {
  description = "Require a super_admin caller"

  input {
    uuid user_id
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $u
  
    precondition ($u != null && $u.type == "super_admin") {
      error_type = "accessdenied"
      error = "Super admin access required"
    }
  }

  response = $u
  guid = "OsSAyUtfaJQlg9bK2MYrn0Us9rM"
}
