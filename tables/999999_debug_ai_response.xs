table debug_ai_response {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid profile_id? {
      table = "profile"
    }
  
    uuid bidder_id? {
      table = "bidder"
    }
  
    text ai_provider?
    int input_tokens?
    int output_tokens?
    text raw_response?
    text job_url?
    text job_description_snippet?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "bidder_id", op: "asc"}]}
  ]
}