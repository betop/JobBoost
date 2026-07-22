table blacklisted_company {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text name
    uuid created_by? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "name"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}