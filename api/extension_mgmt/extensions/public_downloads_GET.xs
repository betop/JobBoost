// GET /extensions/public-downloads  (public, no auth)
// For each extension (swiftcv, mail-triage) returns its live release:
// {extension_name, display_name, version, release_date, released_at, changelog, file_name, file_size, download_url}
// Extensions without a live release have version etc. = null; without a file, download_url = null.
query "extensions/public-downloads" verb=GET {
  api_group = "extension_mgmt"

  input {
  }

  stack {
    var $names {
      value = ["swiftcv", "mail-triage"]
    }
  
    var $result {
      value = []
    }
  
    foreach ($names) {
      each as $n {
        db.query extension_version {
          where = $db.extension_version.extension_name == $n && $db.extension_version.is_current == true
          return = {type: "single"}
        } as $live
      
        var $display {
          value = $n == "swiftcv" ? "SwiftCV Resume Assistant" : "Mail Triage"
        }
      
        conditional {
          if ($live != null) {
            array.push $result {
              value = {
                extension_name: $n
                display_name  : $display
                version       : $live.version
                release_date  : $live.release_date
                released_at   : $live.released_at ?? $live.release_date
                changelog     : $live.changelog
                file_name     : $live.file_name
                file_size     : $live.file_size
                download_url  : $live.file_url
              }
            }
          }
        
          else {
            array.push $result {
              value = {
                extension_name: $n
                display_name  : $display
                version       : null
                release_date  : null
                released_at   : null
                changelog     : null
                file_name     : null
                file_size     : null
                download_url  : null
              }
            }
          }
        }
      }
    }
  }

  response = $result
  guid = "2x4Xf8a_b2AoJYN2KUUZIYuPXWI"
}
