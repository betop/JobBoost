// POST /extensions/versions  (multipart/form-data, super_admin only)
// Fields: extension_name ("swiftcv"|"mail-triage"), version (digits and dots), changelog?, min_extension_version?, notes?,
//   file (the setup .zip, max 100 MB, required)
// Creates a DRAFT version (is_current=false, status="draft"); the file is stored publicly.
// Returns the formatted version (see GET /extensions/versions).
query "extensions/versions" verb=POST {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    text extension_name? filters=trim|lower
    text version? filters=trim
    text changelog? filters=trim
    text min_extension_version? filters=trim
    text notes? filters=trim
    file file?
  }

  stack {
    function.run "extension/assert_super_admin" {
      input = {user_id: $auth.id}
    } as $caller
  
    precondition ($input.file != null) {
      error_type = "inputerror"
      error = "Setup file is required"
    }
  
    function.run "extension/validate_release_input" {
      input = {extension_name: $input.extension_name, version: $input.version}
    } as $valid
  
    // the raw upload exposes no metadata (name/size) until it is stored, so store first, then check and clean up
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
  
    var $file_url {
      value = "https://api.shsws-solutions.com" ~ $stored.path
    }
  
    db.add extension_version {
      enforce_hidden_fields = false
      data = {
        extension_name       : $input.extension_name
        version              : $valid.version
        changelog            : $input.changelog
        min_extension_version: $input.min_extension_version
        notes                : $input.notes
        release_date         : now
        is_current           : false
        status               : "draft"
        created_by           : $auth.id
        file_name            : $stored.name
        file_size            : $stored.size
        file_url             : $file_url
        file_path            : $stored.path
      }
    } as $new_version
  
    function.run "extension/format_version" {
      input = {row: $new_version}
    } as $out
  }

  response = $out
  guid = "S6rS7Ja83i_82cXuXg4CrIfjzp0"
}
