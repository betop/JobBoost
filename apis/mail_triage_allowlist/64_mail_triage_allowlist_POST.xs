// Add an email to the Mail Triage allowlist
query mail_triage_allowlist verb=POST {
  api_group = "mail_triage_allowlist"
  auth = "users"

  input {
    text email?
    text notes?
  }

  stack {
    precondition ($input.email != null && $input.email != "") {
      error_type = "badrequest"
      error = "email is required"
    }
  
    // Check for duplicates
    db.query mail_triage_allowlist {
      where = $db.mail_triage_allowlist.email == $input.email
      return = {type: "single"}
    } as $existing
  
    precondition ($existing == null) {
      error_type = "badrequest"
      error = "This email is already in the allowlist"
    }
  
    db.add mail_triage_allowlist {
      data = {
        email     : $input.email
        notes     : $input.notes
        created_at: now
        updated_at: now
      }
    } as $entry
  }

  response = $entry
}