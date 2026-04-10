// GET /extensions/versions/current
// Get the current (active) version for a specific extension
// Required query param: extension_name ("swiftcv" or "mail-triage")
// Returns: {id, extension_name, version, release_date, changelog}
// Error if no current version is set for the extension
query "extensions/versions/current" verb=GET {
  api_group = "extensions"

  input {
    text extension_name? filters=trim|lower
  }

  stack {
    precondition ($input.extension_name != null && $input.extension_name != "") {
      error_type = "inputerror"
      error = "extension_name is required"
    }
  
    db.query extension_version {
      where = ($db.extension_version.extension_name == $input.extension_name && $db.extension_version.is_current == true) == true
      return = {type: "single"}
    } as $currentVersion
  
    precondition ($currentVersion != null) {
      error_type = "notfound"
      error = "No current version set for extension: " + $input.extension_name
    }
  }

  response = {
    id            : $currentVersion.id
    extension_name: $currentVersion.extension_name
    version       : $currentVersion.version
    release_date  : $currentVersion.release_date
    changelog     : $currentVersion.changelog
  }
}