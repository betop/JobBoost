// GET /extensions/versions
// List all extension versions (optionally filtered by extension_name), newest first.
// Returns array of {id, extension_name, version, release_date, is_current, status, changelog,
//   min_extension_version, notes, file_name, file_size, file_url, released_at, released_by, released_by_name, created_by, created_at}
// status is derived for legacy rows: is_current -> live, else archived if released_at set, else draft.
query "extensions/versions" verb=GET {
  api_group = "extension_mgmt"

  input {
    text extension_name? filters=trim|lower
  }

  stack {
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
  
    var $result {
      value = []
    }
  
    foreach ($versions) {
      each as $v {
        var $by_name {
          value = null
        }
      
        conditional {
          if ($v.released_by != null) {
            db.get users {
              field_name = "id"
              field_value = $v.released_by
            } as $by
          
            conditional {
              if ($by != null) {
                var.update $by_name {
                  value = $by.full_name
                }
              }
            }
          }
        }
      
        function.run "extension/format_version" {
          input = {row: $v, released_by_name: $by_name}
        } as $item
      
        array.push $result {
          value = $item
        }
      }
    }
  }

  response = $result
  guid = "Mwi7cbiUgWIiZO0A52TwFwKoLwk"
}
