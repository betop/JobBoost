// Release state machine: makes `version_id` the live version of its extension.
// The previously live version(s) of the same extension become archived (is_current=false).
// Releasing an archived version is a rollback. is_current stays the source of truth for "live".
function "extension/release_version" {
  description = "Release (or roll back to) an extension version"

  input {
    uuid version_id
    uuid? released_by?
  }

  stack {
    db.get extension_version {
      field_name = "id"
      field_value = $input.version_id
    } as $version
  
    precondition ($version != null) {
      error_type = "notfound"
      error = "Version not found"
    }
  
    db.query extension_version {
      where = $db.extension_version.extension_name == $version.extension_name && $db.extension_version.id != $input.version_id && $db.extension_version.is_current == true
      return = {type: "list"}
    } as $others
  
    foreach ($others) {
      each as $other {
        db.patch extension_version {
          field_name = "id"
          field_value = $other.id
          data = {is_current: false, status: "archived", updated_at: now}
        } as $archived
      }
    }
  
    db.patch extension_version {
      field_name = "id"
      field_value = $input.version_id
      data = {
        is_current : true
        status     : "live"
        released_at: now
        released_by: $input.released_by
        updated_at : now
      }
    } as $updated
  }

  response = $updated
  guid = "j8PW3mgCTvswukOeUX54-OI3Pf0"
}
