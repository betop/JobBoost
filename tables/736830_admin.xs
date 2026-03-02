table admin {
  auth = true

  schema {
    uuid id
    timestamp created_at?=now
    text name?
    email email?
    password password_hash?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}