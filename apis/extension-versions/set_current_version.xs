// PATCH /extensions/versions/{id}/set-current
query "extensions/versions/{id}/set-current" verb=PATCH {
  api_group = "extension_mgmt"
  auth = "admin"

  input {
    uuid id?
  }

  stack {
    precondition ($input.id != null) {
      error_type = "inputerror"
      error = "id is required"
    }
  
    db.get extension_version {
      field_name = "id"
      field_value = $input.id
    } as $version
  
    precondition ($version != null) {
      error_type = "notfound"
      error = "Version not found"
    }
  
    db.patch extension_version {
      field_name = "id"
      field_value = $input.id
      data = {is_current: true}
    } as $updated
  }

  response = {success: true, version: $updated.version}
}