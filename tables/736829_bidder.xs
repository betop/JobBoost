// bidder table — profile_ids is a UUID array (supports multiple profiles per bidder)
table bidder {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    email email?
    text full_name?
    uuid[] profile_ids? {
      table = "profile"
    }
  
    bool is_active?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}