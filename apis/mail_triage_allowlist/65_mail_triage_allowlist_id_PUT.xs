// Update a Mail Triage allowlist entry
query "mail_triage_allowlist/{id}" verb=PUT {
  api_group = "mail_triage_allowlist"
  auth = "users"

  input {
    uuid id?
    text email?
    text notes?
  }

  stack {
    db.get mail_triage_allowlist {
      field_name = "id"
      field_value = $input.id
    } as $entry
  
    precondition ($entry != null) {
      error_type = "notfound"
      error = "Allowlist entry not found"
    }
  
    var $payload {
      value = {}
    }
  
    conditional {
      if ($input.email != null) {
        // Check for duplicate email (excluding self)
        db.query mail_triage_allowlist {
          where = $db.mail_triage_allowlist.email == $input.email && $db.mail_triage_allowlist.id != $input.id
          return = {type: "single"}
        } as $dup
      
        precondition ($dup == null) {
          error_type = "badrequest"
          error = "This email is already in the allowlist"
        }
      
        var.update $payload.email {
          value = $input.email
        }
      }
    }
  
    conditional {
      if ($input.notes != null) {
        var.update $payload.notes {
          value = $input.notes
        }
      }
    }
  
    var.update $payload.updated_at {
      value = now
    }
  
    db.patch mail_triage_allowlist {
      field_name = "id"
      field_value = $input.id
      data = $payload
    } as $updated
  }

  response = $updated
}