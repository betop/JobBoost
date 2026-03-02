table generation_log {
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
  
    text job_url?
    text job_description_snippet?
    text job_description?
    text ai_provider?
    int input_tokens?
    int output_tokens?
    text resume_filename?
    text cover_letter_filename?
    text position_title?
    text company_name?
    int is_regenerated?
    text original_log_id?
    int is_matched?
    text match_reason?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "bidder_id", op: "asc"}]}
  ]
}