// PATCH /extensions/versions/{id}/set-current
query "extensions/versions/{id}/set-current" verb=PATCH {
  api_group = "extension_mgmt"
  auth = "users"

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
  
    // Unset ALL other versions for this extension
    db.query extension_version {
      where = $db.extension_version.extension_name == $version.extension_name && $db.extension_version.id != $input.id
      return = {type: "list"}
    } as $other_versions
  
    // Loop through and unset each one
    foreach ($other_versions) {
      each as $other {
        db.patch extension_version {
          field_name = "id"
          field_value = $other.id
          data = {is_current: false}
        } as $patched
      }
    }
  
    // Set new current version
    db.patch extension_version {
      field_name = "id"
      field_value = $input.id
      data = {is_current: true}
    } as $updated
  }

  response = {success: true, version: $updated.version}
  guid = "vjNxBfZkulxnoY8aemeQh-aVNYs"
}