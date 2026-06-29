table profile {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text full_name?
    email email?
    text phone_number?
    text location?
    text linkedin_url?
    text github_url?
    text job_category?
    int resume_template?=1
    timestamp updated_at?
    bool is_approved?
    uuid created_by? {
      table = "users"
    }
  
    bool include_key_projects?=true
    bool include_certifications?=true
    bool include_achievements?=true
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "is_approved", op: "asc"}]}
  ]
}