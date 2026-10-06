// PATCH /extensions/versions/{extension_version_id}  (multipart or JSON, super_admin only)
// Optional: version, changelog, min_extension_version, notes, release_date, file (replaces the stored setup file)
// Returns the formatted version.
query "extensions/versions/{extension_version_id}" verb=PATCH {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    uuid extension_version_id
    text version? filters=trim
    text changelog?
    text min_extension_version?
    text notes?
    timestamp release_date?
    file file?
  }

  stack {
    function.run "extension/assert_super_admin" {
      input = {user_id: $auth.id}
    } as $caller
  
    db.get extension_version {
      field_name = "id"
      field_value = $input.extension_version_id
    } as $existing
  
    precondition ($existing != null) {
      error_type = "notfound"
      error = "Version not found"
    }
  
    var $update_data {
      value = {updated_at: now}
    }
  
    conditional {
      if ($input.changelog != null) {
        var.update $update_data {
          value = $update_data|set:"changelog":$input.changelog
        }
      }
    }
  
    conditional {
      if ($input.min_extension_version != null) {
        var.update $update_data {
          value = $update_data|set:"min_extension_version":$input.min_extension_version
        }
      }
    }
  
    conditional {
      if ($input.notes != null) {
        var.update $update_data {
          value = $update_data|set:"notes":$input.notes
        }
      }
    }
  
    conditional {
      if ($input.release_date != null) {
        var.update $update_data {
          value = $update_data|set:"release_date":$input.release_date
        }
      }
    }
  
    conditional {
      if ($input.version != null && $input.version != "" && $input.version != $existing.version) {
        function.run "extension/validate_release_input" {
          input = {
            extension_name: $existing.extension_name
            version       : $input.version
            exclude_id    : $existing.id
          }
        } as $valid_ver
      
        var.update $update_data {
          value = $update_data|set:"version":$valid_ver.version
        }
      }
    }
  
    conditional {
      if ($input.file != null) {
        // the raw upload exposes no metadata until stored: store, check, clean up on failure
        var $stored {
          value = null
        }
        
        try_catch {
          try {
            storage.create_attachment {
              access = "public"
              value = $input.file
              filename = ""
            } as $saved
          
            var.update $stored {
              value = $saved
            }
          }
          catch {
            debug.log {
              value = "setup file could not be stored (empty or unreadable)"
            }
          }
        }
        
        precondition ($stored != null) {
          error_type = "inputerror"
          error = "Setup file must be between 1 byte and 100 MB"
        }
      
        function.run "extension/validate_release_file" {
          input = {file_name: $stored.name, file_size: $stored.size}
        } as $file_check
      
        conditional {
          if ($file_check.error != null) {
            storage.delete_file {
              pathname = $stored.path
            }
          }
        }
      
        precondition ($file_check.error == null) {
          error_type = "inputerror"
          error = $file_check.error
        }
      
        var.update $update_data {
          value = $update_data
            |set:"file_name":$stored.name
            |set:"file_size":$stored.size
            |set:"file_url":("https://api.shsws-solutions.com" ~ $stored.path)
            |set:"file_path":$stored.path
        }
      }
    }
  
    db.patch extension_version {
      field_name = "id"
      field_value = $input.extension_version_id
      data = $update_data
    } as $updated
  
    // remove the replaced file only after the row points at the new one
    conditional {
      if ($input.file != null && $existing.file_path != null && $existing.file_path != "") {
        try_catch {
          try {
            storage.delete_file {
              pathname = $existing.file_path
            }
          }
          catch {
            debug.log {
              value = "old extension file could not be deleted"
            }
          }
        }
      }
    }
  
    function.run "extension/format_version" {
      input = {row: $updated}
    } as $out
  }

  response = $out
  guid = "zZFQv-kOsSUKJXkmwHF82biD7_Y"
}
