// PATCH /extensions/versions/:id
// Edit an existing extension version (admin auth required)
// Optional body fields: changelog, release_date, version
// Returns: updated version record
// PATCH /extensions/versions/{extension_version_id}
// Edit an existing extension version (admin auth required)
query "extensions/versions/{extension_version_id}" verb=PATCH {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    uuid extension_version_id
    text version?
    text changelog?
    timestamp release_date?
  }

  stack {
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
      if ($input.release_date != null) {
        var.update $update_data {
          value = $update_data
            |set:"release_date":$input.release_date
        }
      }
    }
  
    conditional {
      if ($input.version != null && $input.version != "") {
        var.update $update_data {
          value = $update_data|set:"version":$input.version
        }
      }
    }
  
    db.patch extension_version {
      field_name = "id"
      field_value = $input.extension_version_id
      data = $update_data
    } as $updated
  }

  response = {
    id            : $updated.id
    extension_name: $updated.extension_name
    version       : $updated.version
    release_date  : $updated.release_date
    is_current    : $updated.is_current
    changelog     : $updated.changelog
  }
}