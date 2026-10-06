// Throws badrequest when the version is the live one.
function "extension/assert_deletable" {
  description = "A live extension version cannot be deleted"

  input {
    uuid version_id
  }

  stack {
    db.get extension_version {
      field_name = "id"
      field_value = $input.version_id
    } as $existing
  
    precondition ($existing != null) {
      error_type = "notfound"
      error = "Version not found"
    }
  
    precondition ($existing.is_current != true) {
      error_type = "badrequest"
      error = "Cannot delete the live version, release another version first"
    }
  }

  response = $existing
  guid = "qo5o_uTj8vzUQcCJ-cgtRvNRKM8"
}
