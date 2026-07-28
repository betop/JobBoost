// token_request table — stores key generation requests from admins
// status: pending, approved, declined
// Once approved by super_admin, a real access_token is generated
table token_request {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid requested_by? {
      table = "users"
    }
  
    uuid user_id? {
      table = "users"
    }
  
    timestamp expiration_date?
    text status?=pending
    uuid reviewed_by? {
      table = "users"
    }
  
    timestamp reviewed_at?
    text admin_notes?
    text review_notes?
    uuid generated_token_id? {
      table = "access_token"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "requested_by"}]}
    {type: "btree", field: [{name: "status"}]}
  ]
  guid = "7TjN7PRSMRWAWISGT_dNg0kckDM"
}