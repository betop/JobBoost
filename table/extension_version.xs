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
    text? status?
    timestamp? released_at?
    uuid? released_by? {
      table = "users"
    }
  
    uuid? created_by? {
      table = "users"
    }
  
    text? file_name?
    int? file_size?
    text? file_url?
    text? file_path?
    text? notes?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "extension_name"}]}
    {type: "btree", field: [{name: "is_current"}]}
  ]

  guid = "ZKZ8AetQ1NDdxPB_t5J5H8thmuQ"
}