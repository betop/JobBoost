// users table — profile_ids is a UUID array (supports multiple profiles per user)\n// is_approved controls admin login access (super_admin bypasses this)\n// created_by tracks which admin created this user\n// assigned_bidder_ids on admin records = bidders assigned to that admin by super_admin
table users {
  auth = true

  schema {
    uuid id
    timestamp created_at?=now
    email email?
    text full_name?
    password password_hash?
    text type?=bidder
    uuid[] profile_ids? {
      table = "profile"
    }
  
    bool is_active?
    bool is_approved?
    timestamp updated_at?
    uuid created_by? {
      table = "users"
    }
  
    uuid[] assigned_bidder_ids? {
      table = "users"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}