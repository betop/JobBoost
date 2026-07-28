// Public endpoint — returns job description for a generation log by ID
// No authentication required (used for public shareable links)
query "public/jd/{id}" verb=GET {
  api_group = "public"

  input {
    uuid id?
  }

  stack {
    precondition ($input.id != null) {
      error_type = "badrequest"
      error = "id is required"
    }
  
    db.get generation_log {
      field_name = "id"
      field_value = $input.id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Job description not found"
    }
  }

  response = {
    id             : $log.id
    position_title : $log.position_title
    company_name   : $log.company_name
    job_url        : $log.job_url
    job_description: $log.job_description
    seniority      : $log.seniority
    tech_scope     : $log.tech_scope
    created_at     : $log.created_at
  }
  guid = "mJSGg7SjWyVhpl0Iz5zyx-5ArPc"
}