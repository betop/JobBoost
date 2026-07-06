table chat_log {
  auth = false

  schema {
    uuid id
    uuid user_id?
    uuid log_id?
    text question?
    text answer?
    int input_tokens?
    int output_tokens?
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "user_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}