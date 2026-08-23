// Delete a Mail Triage allowlist entry
query "mail_triage_allowlist/{id}" verb=DELETE {
  api_group = "mail_triage_allowlist"
  auth = "users"

  input {
    uuid id?
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
  
    db.del mail_triage_allowlist {
      field_name = "id"
      field_value = $input.id
    }
  }

  response = {success: true}
  guid = "lV1CgmepNLA78ExNYnD9dJBIPRM"
}