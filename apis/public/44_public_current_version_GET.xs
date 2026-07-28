// Get current version for an extension
// Query param: extension_name (required: "swiftcv" or "mail-triage")
// Returns: {id, extension_name, version, release_date, changelog}
// Error if no current version is set
// Return the current version
query "public/current-version" verb=GET {
  api_group = "public"

  input {
    text extension_name?
  }

  stack {
    precondition ($input.extension_name != null && $input.extension_name != "") {
      error_type = "badrequest"
      error = "Missing required query parameter: extension_name"
    }
  
    // Query for the current version
    db.query extension_version {
      where = $db.extension_version.extension_name == $input.extension_name && $db.extension_version.is_current == true
      return = {type: "single"}
    } as $version
  
    precondition ($version != null) {
      error_type = "notfound"
      error = "No current version found for " + $input.extension_name
    }
  }

  response = {
    id            : $version.id
    extension_name: $version.extension_name
    version       : $version.version
    release_date  : $version.release_date
    changelog     : $version.changelog
  }
  guid = "wy0b35Dn-fvZxERMHzlcVU9DkEs"
}