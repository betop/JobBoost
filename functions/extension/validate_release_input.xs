// Validates extension version metadata. Throws inputerror on the first problem.
// exclude_id: ignore that row in the duplicate check (when editing).
function "extension/validate_release_input" {
  description = "Validate extension_name, version format/uniqueness "

  input {
    text extension_name?
    text version?
    uuid exclude_id?
  }

  stack {
    precondition ($input.extension_name == "swiftcv" || $input.extension_name == "mail-triage") {
      error_type = "inputerror"
      error = "extension_name must be one of: swiftcv, mail-triage"
    }
  
    var $ver {
      value = ($input.version ?? "")|trim
    }
  
    var $ver_pattern {
      value = "/^\\d+(\\.\\d+)+$/"
    }
  
    precondition ($ver != "" && ($ver_pattern|regex_matches:$ver)) {
      error_type = "inputerror"
      error = "version must contain only digits and dots, like 1.2.3 or 0.3"
    }
  
    db.query extension_version {
      where = $db.extension_version.extension_name == $input.extension_name && $db.extension_version.version == $ver
      return = {type: "list"}
    } as $same
  
    var $dups {
      value = $same|filter:$$.id != $input.exclude_id
    }
  
    precondition (($dups|count) == 0) {
      error_type = "inputerror"
      error = "Version " ~ $ver ~ " already exists for " ~ $input.extension_name
    }
  }

  response = {version: $ver}
  guid = "3qKaaQ2XWOQJlDe9YPmKuAoJLJg"
}
