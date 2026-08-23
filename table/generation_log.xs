// generation_log table - indexes updated
// v4: use ?field? syntax for truly nullable PostgreSQL columns (content_id, is_applied)
table generation_log {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    uuid profile_id? {
      table = "profile"
    }
  
    uuid user_id? {
      table = "users"
    }
  
    text job_url?
    text job_description_snippet?
    text job_description?
    text ai_provider?
    int input_tokens?
    int output_tokens?
    int cache_creation_input_tokens?
    int cache_read_input_tokens?
    text resume_filename?
    text cover_letter_filename?
    text position_title?
    text company_name?
    int is_regenerated?
    text original_log_id?
    int is_matched?
    text match_reason?
    bool is_applied?
    text seniority?
    text tech_scope?
    text compensation?
    uuid? content_id? {
      table = "resume_content"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "updated_at", op: "desc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "user_id", op: "asc"}]}
    {type: "btree", field: [{name: "job_url", op: "asc"}]}
  ]

  guid = "Tz1m3zqYJVFFpH9Xteuz7syCTOE"
}