table rule {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    text sentence?
    text target_section?
    bool is_active?
    uuid created_by_admin_id? {
      table = "users"
    }
  
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]

  guid = "3x2UkdtVIzAS8qqVrjWCphfSIZI"
}