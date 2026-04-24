table extension_version {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text extension_name
    text version
    timestamp release_date
    bool is_current?
    text changelog?
    text min_extension_version?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "extension_name"}]}
    {type: "btree", field: [{name: "is_current"}]}
  ]
}