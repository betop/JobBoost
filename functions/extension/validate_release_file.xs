// Checks an already-stored setup file (name and size come from storage.create_attachment).
// Does not throw: returns {error: null} when valid, otherwise {error: "<message>"} so the caller can delete the stored file first.
function "extension/validate_release_file" {
  description = "Check stored setup file is a non-empty .zip under 100 MB"

  input {
    text file_name?
    int file_size?
  }

  stack {
    var $err {
      value = null
    }
  
    conditional {
      if (!(($input.file_name ?? "")|to_lower|ends_with:".zip")) {
        var.update $err {
          value = "Setup file must be a .zip file"
        }
      }
      elseif ($input.file_size == null || $input.file_size <= 0 || $input.file_size > 104857600) {
        var.update $err {
          value = "Setup file must be between 1 byte and 100 MB"
        }
      }
    }
  }

  response = {error: $err}
  guid = "validate-release-file-0001"
}
