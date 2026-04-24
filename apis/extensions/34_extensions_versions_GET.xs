// GET /extensions/versions
// List all extension versions with optional filtering by extension_name
// Query params: extension_name (optional, "swiftcv" or "mail-triage")
// Returns: array of {id, extension_name, version, release_date, is_current, changelog}
// Ordered by: created_at descending
query "extensions/versions" verb=GET {
  api_group = "extensions"

  input {
    text extension_name? filters=trim|lower
  }

  stack {
    // Build conditional query based on whether extension_name filter is provided
    conditional {
      if ($input.extension_name != null && $input.extension_name != "") {
        db.query extension_version {
          where = $db.extension_version.extension_name == $input.extension_name
          sort = {extension_version.created_at: "desc"}
          return = {type: "list"}
        } as $versions
      }
    
      else {
        db.query extension_version {
          sort = {extension_version.created_at: "desc"}
          return = {type: "list"}
        } as $versions
      }
    }
  }

  response = $versions
}