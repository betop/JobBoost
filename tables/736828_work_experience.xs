table work_experience {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid profile_id? {
      table = "profile"
    }
  
    text job_title?
    text company_name?
    text employment_type?
    text location?
    date start_date?
    date end_date?
    bool is_current?
    text description?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}