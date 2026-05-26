table mail_triage_log {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    uuid profile_id? {
      table = "profile"
    }
  
    text gmail_email?
    int input_tokens?
    int output_tokens?
    int email_count?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
  ]
}