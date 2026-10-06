table mail_triage_log {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    text gmail_email?
    int input_tokens?
    int output_tokens?
    int cache_creation_input_tokens?
    int cache_read_input_tokens?
    int email_count?
    decimal? usage_rate?
    decimal? charged_amount?
    uuid? billing_admin_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "CtBrTm4Nhbx0IykMYH-iubfUuto"
}