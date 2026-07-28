// POST /extensions/versions
// Create a new extension version (admin auth required)
// Required body fields: extension_name, version
// Optional body fields: changelog
// Sets release_date to now, is_current to false
// Returns: {id, extension_name, version, release_date, is_current}
query "extensions/versions" verb=POST {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    text extension_name? filters=trim|lower
    text version? filters=trim
    text changelog? filters=trim
  }

  stack {
    precondition ($input.extension_name != null && $input.extension_name != "") {
      error_type = "inputerror"
      error = "extension_name is required"
    }
  
    precondition ($input.version != null && $input.version != "") {
      error_type = "inputerror"
      error = "version is required"
    }
  
    db.add extension_version {
      enforce_hidden_fields = false
      data = {
        extension_name: $input.extension_name
        version       : $input.version
        changelog     : $input.changelog
        release_date  : now
        is_current    : false
      }
    } as $newVersion
  }

  response = {
    id            : $newVersion.id
    extension_name: $newVersion.extension_name
    version       : $newVersion.version
    release_date  : $newVersion.release_date
    is_current    : $newVersion.is_current
  }
  guid = "S6rS7Ja83i_82cXuXg4CrIfjzp0"
}