// Derives the release status of an extension_version row.
// Stored status wins; for legacy rows without status: is_current -> live, released_at set -> archived, else draft.
function "extension/derive_status" {
  description = "Release status (draft/live/archived) of an extension_version row"

  input {
    bool is_current?
    text status?
    timestamp released_at?
  }

  stack {
    var $result {
      value = "draft"
    }
  
    conditional {
      if ($input.is_current == true) {
        var.update $result {
          value = "live"
        }
      }
    
      elseif ($input.status != null && $input.status != "") {
        var.update $result {
          value = $input.status
        }
      }
    
      elseif ($input.released_at != null) {
        var.update $result {
          value = "archived"
        }
      }
    }
  }

  response = $result
  guid = "tYi7jjGE50N_q-FbpbNTmb4Au0s"
}
