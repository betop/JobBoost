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
    int resume_template?=11
    timestamp updated_at?
    bool is_approved?
    uuid created_by? {
      table = "users"
    }
    uuid billing_admin_id? {
      table = "users"
    }
  
    bool include_key_projects?=true
    bool include_certifications?=true
    bool include_achievements?=true
    bool use_legacy_api?
    bool hide?
    bool block_lead_roles?
    bool check_duplicate_url?=true {
      description = "When false, resume generation skips the same-job-URL duplicate check; null/true = check"
    }
    bool tailor_job_title?=true
    text allowed_languages?="English"
    json resume_sections? {
      description = "Per-profile resume section/item visibility: flat JSON object of booleans (e.g. {\"summary\": false, \"work_company_name\": true}); null = use defaults"
    }

    text spoken_languages? {
      description = "Candidate's spoken languages, comma separated (e.g. \"English (Native), Spanish (Professional)\"); rendered in the optional Languages section"
    }

    text default_compensation?
    // Selected Claude model (ai/resolve_model): claude-haiku-5-5 (default), claude-sonnet-5-5 or claude-haiku-4-5 (legacy)
    text ai_model?="claude-haiku-5-5"
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "is_approved", op: "asc"}]}
  ]

  guid = "yqkDMFxCA8-2ZXTyxn_YxrZEvTM"
}