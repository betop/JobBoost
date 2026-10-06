// Makes sure an email is on the Mail Triage allowlist (mail_triage_allowlist has a unique index on email).
// The email is trimmed and lowercased. Empty emails are ignored. Existing entries are left untouched.
// Returns {added: bool}. Callers that must not fail (profile create/update) wrap this in try_catch.
function "mail_triage/ensure_allowlisted" {
  description = "Add an email to the Mail Triage allowlist if missing (idempotent)"

  input {
    text email?
    text notes?
  }

  stack {
    var $clean {
      value = ($input.email|first_notnull:"")|trim|to_lower
    }

    var $added {
      value = false
    }

    conditional {
      if ($clean != "") {
        db.query mail_triage_allowlist {
          where = $db.mail_triage_allowlist.email == $clean
          return = {type: "single"}
        } as $existing

        conditional {
          if ($existing == null) {
            db.add mail_triage_allowlist {
              data = {
                email     : $clean
                notes     : $input.notes
                created_at: now
                updated_at: now
              }
            } as $entry

            var.update $added {
              value = true
            }
          }
        }
      }
    }

    var $result {
      value = {added: $added}
    }
  }

  response = $result
  guid = "NjHqWw2ShvDX_xhJ96oaOOV50JM"
}
