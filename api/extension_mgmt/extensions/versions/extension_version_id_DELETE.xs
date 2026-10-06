// DELETE /extensions/versions/{extension_version_id}  (super_admin only)
// Refuses to delete the live version. Deletes the row and its stored setup file.
// Returns {success: true}
query "extensions/versions/{extension_version_id}" verb=DELETE {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    uuid extension_version_id
  }

  stack {
    function.run "extension/assert_super_admin" {
      input = {user_id: $auth.id}
    } as $caller
  
    function.run "extension/assert_deletable" {
      input = {version_id: $input.extension_version_id}
    } as $existing
  
    conditional {
      if ($existing.file_path != null && $existing.file_path != "") {
        try_catch {
          try {
            storage.delete_file {
              pathname = $existing.file_path
            }
          }
          catch {
            debug.log {
              value = "extension file could not be deleted"
            }
          }
        }
      }
    }
  
    db.del extension_version {
      field_name = "id"
      field_value = $input.extension_version_id
    }
  }

  response = {success: true}
  guid = "rGGrAkgwxpm1LZAhi36-KyvMfRs"
}
