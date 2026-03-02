table rule {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text sentence?
    text target_section?
    bool is_active?
    uuid created_by_admin_id? {
      table = "admin"
    }
  
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}