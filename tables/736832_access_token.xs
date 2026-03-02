table access_token {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text token?
    uuid bidder_id? {
      table = "bidder"
    }
  
    uuid created_by_admin_id? {
      table = "admin"
    }
  
    timestamp issued_at?=now
    timestamp expires_at?
    bool is_used?
    bool is_active?=true
    text token_hash?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "token_hash"}]}
    {type: "btree", field: [{name: "bidder_id"}]}
  ]
}