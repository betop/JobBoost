// List all allowed emails for Mail Triage
query mail_triage_allowlist verb=GET {
  api_group = "mail_triage_allowlist"
  auth = "users"

  input {
  }

  stack {
    db.query mail_triage_allowlist {
      sort = {mail_triage_allowlist.created_at: "desc"}
      return = {type: "list"}
    } as $entries
  }

  response = $entries
  guid = "RbftTkLT4PdClbRWEeY-V8Y5dsY"
}