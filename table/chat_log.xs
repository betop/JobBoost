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
    int cache_creation_input_tokens?
    int cache_read_input_tokens?
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "user_id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "Ql-xdU_kLspoGvV4WhQRhN3iI6w"
}