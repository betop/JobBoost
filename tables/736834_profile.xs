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
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}