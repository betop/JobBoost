// Generate resume and cover letter for a job description
// v4.4: table schema fix — content_id is now nullable UUID so db.add works without providing it
query "resume/generate" verb=POST {
  api_group = "resume"

  input {
    uuid profile_id?
    text job_description?
    text token?
    text job_url?
    text extension_version?
    bool force_generate?
    uuid log_id?
  }

  stack {
    precondition ($input.profile_id != null) {
      error_type = "badrequest"
      error = "profile_id is required"
    }
  
    precondition ($input.job_url != null) {
      error_type = "badrequest"
      error = "profile_id is required"
    }
  
    precondition ($input.job_description != null) {
      error_type = "badrequest"
      error = "job_description is required"
    }
  
    // Reject short inputs (e.g. just a job title or URL) – a real job description is at least 500 chars
    precondition (($input.job_description|strlen) >= 500) {
      error_type = "badrequest"
      error = "The job description is too short. Please paste the full job description text, not just a job title or link."
    }
  
    precondition ($input.token != null) {
      error_type = "accessdenied"
      error = "Missing authorization key"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token && $db.access_token.is_active == true && $db.access_token.expires_at < now && $db.access_token.user_id != null
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid key"
    }
  
    precondition ($access.user_id != null && $access.user_id != "") {
      error_type = "accessdenied"
      error = "Token has no associated user"
    }
  
    db.get users {
      field_name = "id"
      field_value = $access.user_id
    } as $user
  
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "User not found"
    }
  
    precondition ($user.is_active) {
      error_type = "accessdenied"
      error = "User account is inactive"
    }
  
    conditional {
      // Check user type and version mismatch for the bidder type users
      if ($user.type == "bidder") {
        db.query extension_version {
          where = $db.extension_version.extension_name == "swiftcv" && $db.extension_version.is_current == true && $db.extension_version.version == $input.extension_version
          return = {type: "single"}
        } as $current_version
      
        precondition ($current_version != null) {
          error_type = "badrequest"
          error = "Extension version mismatch. Please update your extension to the latest version."
        }
      }
    }
  
    var $match_status {
      value = 1
    }
  
    var $error_msg {
      value = ""
    }
  
    var $should_generate {
      value = false
    }
  
    var $extraction_json {
      value = {}
    }
  
    var $company_name {
      value = ""
    }
  
    var $position_title {
      value = ""
    }
  
    var $seniority_txt {
      value = ""
    }
  
    var $tech_scope_txt {
      value = ""
    }
  
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
    } as $prof
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $prof.id
      sort = {work_experience.start_date: "desc"}
      return = {type: "list"}
    } as $work
  
    conditional {
      if ($input.force_generate == false) {
        db.query generation_log {
          where = $db.generation_log.job_url == $input.job_url && $db.generation_log.profile_id == $input.profile_id && $db.generation_log.is_matched == 1
          return = {type: "single"}
        } as $potential_duplicate
      
        conditional {
          if ($potential_duplicate != null) {
            var.update $match_status {
              value = 4
            }
          
            var.update $error_msg {
              value = "This job has been applied before. Try with another job."
            }
          
            var.update $company_name {
              value = $potential_duplicate.company_name
            }
          
            var.update $position_title {
              value = $potential_duplicate.position_title
            }
          }
        
          else {
            var $openai_auth {
              value = "Bearer " ~ $env.OPENAI_API_KEY
            }
          
            var $extraction_text {
              value = ""
            }
          
            try_catch {
              try {
                api.request {
                  url = "https://api.openai.com/v1/chat/completions"
                  method = "POST"
                  params = {}
                    |set:"model":"gpt-4o-mini"
                    |set:"max_tokens":400
                    |set:"messages":([]
                      |push:({}
                        |set:"role":"user"
                        |set:"content":"Extract json object ({\n\"is_job_posting\": \"true or false\",\n\"company\": \"full company name or ''\",\n\"position\": \"full position title or ''\",\n\"is_remote\": \"true or false\",\n\"travels_or_relocation_required\": \"true or false\",\n\"is_similar_to_outlier\": \"true or false\",\n\"is_freelancer_marketplace_similar_to_toptal\": \"true or false\",\n\"clearance_required\": \"true or false\",\n\"seniority\": \"either intern, entry, junior, mid, senior, lead, staff, principal, manager, director, vice_president, c_level or founder\",\n\"tech_scope\": \"either ai, machine_learning, data_science, data_analytics, data_engineering, data_research, computer_vision, mlops, generative_ai, ai_security, ai_product, ai_research, edge_ai, speech_ai, recommendation_systems, knowledge_systems, full_stack_ai, backend_ai, frontend_ai, ai_software_engineering, software_engineering, full_stack, backend, frontend or devops. Use machine_learning for deep learning and reinforcement learning roles. Use ai for NLP roles unless another category fits better.\"\n}) from this job description.\n\nJob Description:\n" ~ $input.job_description ~ "\n\nseniority and tech_scope must have only 1 value. Return only JSON. No explanations. No markdown. No additional text."
                      )
                    )
                  headers = []
                    |push:"Content-Type: application/json"
                    |push:"Authorization: " ~ $openai_auth
                } as $extraction_resp
              
                var.update $extraction_text {
                  value = $extraction_resp.response.result.choices
                    |first
                    |get:"message"
                    |get:"content"
                    |trim
                }
              }
            
              catch {
                debug.log {
                  value = "OpenAI extraction failed: " ~ $error
                }
              }
            }
          
            // Replace ```json ... ``` if present (some models wrap JSON in code blocks)
            var $extraction_text_filtered {
              value = $extraction_text
                |replace:"```json\n":""
                |replace:"```JSON\n":""
                |replace:"```\n":""
                |replace:"```":""
                |trim
            }
          
            try_catch {
              try {
                var.update $extraction_json {
                  value = $extraction_text_filtered|json_decode
                }
              }
            
              catch {
                debug.log {
                  value = "OpenAI extraction JSON decode failed: " ~ $error
                }
              }
            }
          
            conditional {
              if ($extraction_json != null) {
                var.update $company_name {
                  value = $extraction_json.company
                }
              
                var.update $position_title {
                  value = $extraction_json.position
                }
              
                var.update $seniority_txt {
                  value = $extraction_json.seniority
                }
              
                var.update $tech_scope_txt {
                  value = $extraction_json.tech_scope
                }
              
                conditional {
                  if ($position_title == "null") {
                    var.update $match_status {
                      value = 2
                    }
                  
                    var.update $error_msg {
                      value = "Position title could not be extracted from the job description. Please make sure the job description includes a clear position title and try again."
                    }
                  }
                
                  elseif ($company_name == "null") {
                    var.update $match_status {
                      value = 2
                    }
                  
                    var.update $error_msg {
                      value = "Company name could not be extracted from the job description. Please make sure the job description includes a clear company name and try again."
                    }
                  }
                
                  else {
                    conditional {
                      if ($extraction_json.is_job_posting == "true") {
                        conditional {
                          if ($extraction_json.is_remote == "true") {
                            conditional {
                              if ($extraction_json.travels_or_relocation_required == "false") {
                                conditional {
                                  if ($extraction_json.is_similar_to_outlier == "false" && $extraction_json.is_freelancer_marketplace_similar_to_toptal == "false") {
                                    conditional {
                                      if ($extraction_json.clearance_required == "false") {
                                        var $possible_seniorities {
                                          value = ["mid", "senior", "lead", "staff"]
                                        }
                                      
                                        var $has_seniority {
                                          value = false
                                        }
                                      
                                        foreach ($possible_seniorities) {
                                          each as $s {
                                            conditional {
                                              if ($extraction_json.seniority == $s) {
                                                var.update $has_seniority {
                                                  value = true
                                                }
                                              }
                                            }
                                          }
                                        }
                                      
                                        conditional {
                                          if ($has_seniority) {
                                            var $has_previous_company {
                                              value = false
                                            }
                                          
                                            foreach ($work) {
                                              each as $work_item {
                                                conditional {
                                                  if (($work_item.company_name|to_lower|trim) == ($extraction_json.company|to_lower|trim)) {
                                                    var.update $has_previous_company {
                                                      value = true
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          
                                            conditional {
                                              if ($has_previous_company) {
                                                var.update $match_status {
                                                  value = 2
                                                }
                                              
                                                var.update $error_msg {
                                                  value = "The candidate has previously worked at or currently works for this company. Try with another job."
                                                }
                                              }
                                            
                                              else {
                                                var $profile_category {
                                                  value = $prof.job_category|split:","
                                                }
                                              
                                                var $has_tech_scope {
                                                  value = false
                                                }
                                              
                                                foreach ($profile_category) {
                                                  each as $c {
                                                    conditional {
                                                      if (($c|trim) == $extraction_json.tech_scope) {
                                                        var.update $has_tech_scope {
                                                          value = true
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              
                                                conditional {
                                                  if ($has_tech_scope) {
                                                    var $fifteen_days_ago {
                                                      value = now
                                                        |transform_timestamp:"-15 days":"UTC"
                                                    }
                                                  
                                                    db.query generation_log {
                                                      where = $db.generation_log.position_title == $position_title && $db.generation_log.profile_id == $input.profile_id && $db.generation_log.is_matched == 1 && $db.generation_log.company_name == $extraction_json.company && $db.generation_log.created_at >= $fifteen_days_ago
                                                      sort = {generation_log.created_at: "desc"}
                                                      return = {type: "single"}
                                                    } as $last_generation_log
                                                  
                                                    conditional {
                                                      if ($last_generation_log == null) {
                                                        var.update $should_generate {
                                                          value = true
                                                        }
                                                      }
                                                    
                                                      else {
                                                        var.update $match_status {
                                                          value = 5
                                                        }
                                                      
                                                        var.update $error_msg {
                                                          value = "This job is possibly reposted. Try with another job."
                                                        }
                                                      }
                                                    }
                                                  }
                                                
                                                  else {
                                                    var.update $match_status {
                                                      value = 0
                                                    }
                                                  
                                                    var.update $error_msg {
                                                      value = "This job is not aligned to the candidate profile. Required tech scope: " ~ $extraction_json.tech_scope
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        
                                          else {
                                            var.update $match_status {
                                              value = 0
                                            }
                                          
                                            var.update $error_msg {
                                              value = "This job's seniority level (" ~ $extraction_json.seniority ~ ") does not match the candidate's profile. Try with another job."
                                            }
                                          }
                                        }
                                      }
                                    
                                      else {
                                        var.update $match_status {
                                          value = 2
                                        }
                                      
                                        var.update $error_msg {
                                          value = "This job requires security clearance. Try with another job."
                                        }
                                      }
                                    }
                                  }
                                
                                  else {
                                    var.update $match_status {
                                      value = 0
                                    }
                                  
                                    var.update $error_msg {
                                      value = "This job is not aligned to the candidate profile. It is a freelancer marketplace or an AI training job. Try with another job."
                                    }
                                  }
                                }
                              }
                            
                              else {
                                var.update $match_status {
                                  value = 2
                                }
                              
                                var.update $error_msg {
                                  value = "This job requires travel or relocation. Try with another job."
                                }
                              }
                            }
                          }
                        
                          else {
                            var.update $match_status {
                              value = 2
                            }
                          
                            var.update $error_msg {
                              value = "This is not a remote job. Try with another job."
                            }
                          }
                        }
                      }
                    
                      else {
                        var.update $match_status {
                          value = 3
                        }
                      
                        var.update $error_msg {
                          value = "This is not a job posting. Please review your selection and try again."
                        }
                      }
                    }
                  }
                }
              }
            
              else {
                var.update $match_status {
                  value = 6
                }
              
                var.update $error_msg {
                  value = "Could not extract structured information from the job description. Please make sure the job description is clear and try again."
                }
              }
            }
          }
        }
      }
    }
  
    var $input_tokens {
      value = 0
    }
  
    var $output_tokens {
      value = 0
    }
  
    var $resume_content_id {
      value = null
    }
  
    var $resume_filename {
      value = ""
    }
  
    var $cover_letter_filename {
      value = ""
    }
  
    var $resume_text {
      value = ""
    }
  
    var $cover_letter_text {
      value = ""
    }
  
    conditional {
      if ($should_generate || $input.force_generate) {
        db.query education {
          where = $db.education.profile_id == $prof.id
          sort = {education.start_date: "asc"}
          return = {type: "list"}
        } as $education
      
        db.query rule {
          where = $db.rule.is_active == true
          sort = {rule.created_at: "asc"}
          return = {type: "list"}
        } as $rules
      
        // Map tech_scope codes to full job title base
        var $tech_scope_full_map {
          value = {}
            |set:"ai":"AI Engineer"
            |set:"machine_learning":"Machine Learning Engineer"
            |set:"data_science":"Data Scientist"
            |set:"data_analytics":"Data Analyst"
            |set:"data_engineering":"Data Engineer"
            |set:"data_research":"Research Scientist"
            |set:"computer_vision":"Computer Vision Engineer"
            |set:"mlops":"MLOps Engineer"
            |set:"generative_ai":"Generative AI Engineer"
            |set:"ai_security":"AI Safety Engineer"
            |set:"ai_product":"AI Product Engineer"
            |set:"ai_research":"AI Research Engineer"
            |set:"edge_ai":"Edge AI Engineer"
            |set:"speech_ai":"Speech & Audio Engineer"
            |set:"recommendation_systems":"Recommendation Systems Engineer"
            |set:"knowledge_systems":"Knowledge Engineer"
            |set:"full_stack_ai":"Full Stack AI Engineer"
            |set:"backend_ai":"Backend AI Engineer"
            |set:"frontend_ai":"Frontend AI Engineer"
            |set:"ai_software_engineering":"AI Software Engineer"
            |set:"software_engineering":"Software Engineer"
            |set:"full_stack":"Full Stack Engineer"
            |set:"backend":"Backend Engineer"
            |set:"frontend":"Frontend Engineer"
            |set:"devops":"DevOps Engineer"
        }
      
        // Get most recent job title from profile work experience (sorted desc)
        var $profile_job_title {
          value = $work
            |first
            |get:"job_title"
            |first_notnull:""
        }
      
        // Look up tech_scope display name — only if $tech_scope_txt is non-empty
        // If key not found or $tech_scope_txt is empty, fall back to the profile's own job title
        var $tech_scope_full {
          value = $profile_job_title
        }
      
        // Track whether we resolved a mapped tech scope (vs falling back to profile title)
        var $tech_scope_mapped {
          value = false
        }
      
        conditional {
          if ($tech_scope_txt != "") {
            var $tech_scope_lookup {
              value = $tech_scope_full_map
                |get:$tech_scope_txt
                |first_notnull:""
            }
          
            conditional {
              if ($tech_scope_lookup != "") {
                var.update $tech_scope_full {
                  value = $tech_scope_lookup
                }
              
                var.update $tech_scope_mapped {
                  value = true
                }
              }
            }
          }
        }
      
        // Extract seniority prefix from the profile's most recent job title
        // e.g. "Senior Machine Learning Engineer" → "Senior"
        var $known_seniority_words {
          value = [
            "Intern"
            "Junior"
            "Senior"
            "Lead"
            "Staff"
            "Principal"
            "Manager"
            "Director"
            "Founder"
          ]
        }
      
        var $profile_title_first_word {
          value = ($profile_job_title|split:" ")|first|first_notnull:""
        }
      
        var $seniority_prefix {
          value = ""
        }
      
        foreach ($known_seniority_words) {
          each as $sw {
            conditional {
              if ($sw == $profile_title_first_word) {
                var.update $seniority_prefix {
                  value = $sw
                }
              }
            }
          }
        }
      
        // Only prepend seniority when tech_scope came from the map (not the profile title fallback)
        // If using profile title fallback, it already contains seniority — use it as-is
        var $last_position_title_for_prompt {
          value = $profile_job_title
        }
      
        conditional {
          if ($tech_scope_mapped) {
            var.update $last_position_title_for_prompt {
              value = ($seniority_prefix ~ " " ~ $tech_scope_full)|trim
            }
          }
        }
      
        // Build work experience text
        // The most recent entry (first) uses $last_position_title_for_prompt as the job title
        var $work_text {
          value = ""
        }
      
        var $work_idx {
          value = 0
        }
      
        foreach ($work) {
          each as $w {
            var $end_label {
              value = $w.end_date|to_text|first_notnull:""
            }
          
            conditional {
              if ($w.is_current) {
                var.update $end_label {
                  value = "Present"
                }
              }
            }
          
            var $location_display {
              value = $w.location
            }
          
            // Extract promotion note from job title (text within parentheses)
            var $promotion_note_display {
              value = ""
            }
          
            var $title_display {
              value = $w.job_title
            }
          
            // For the most recent entry, override with the computed prompt title
            conditional {
              if ($work_idx == 0) {
                var.update $title_display {
                  value = $last_position_title_for_prompt
                }
              }
            }
          
            var $paren_parts {
              value = $w.job_title|split:"("
            }
          
            conditional {
              if (($paren_parts|count) > 1) {
                var $closing_parts {
                  value = ($paren_parts|last)|split:")"
                }
              
                var.update $promotion_note_display {
                  value = $closing_parts|first
                }
              
                // Only override title_display from parens if NOT the first entry
                conditional {
                  if ($work_idx != 0) {
                    var.update $title_display {
                      value = ($paren_parts|first)|trim
                    }
                  }
                }
              }
            }
          
            var.update $work_text {
              value = $work_text ~ ($title_display|first_notnull:"") ~ " | " ~ ($w.company_name|first_notnull:"") ~ " | " ~ ($location_display|first_notnull:"") ~ " | " ~ ($w.start_date|to_text|first_notnull:"") ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
            }
          
            var.update $work_idx {
              value = $work_idx + 1
            }
          }
        }
      
        // Build education text
        var $edu_text {
          value = ""
        }
      
        foreach ($education) {
          each as $e {
            var.update $edu_text {
              value = $edu_text ~ ($e.degree_title|first_notnull:"") ~ " in " ~ ($e.field_of_study|first_notnull:"") ~ " from " ~ ($e.university_name|first_notnull:"") ~ " (" ~ ($e.end_date|to_text|first_notnull:"") ~ ") "
            }
          }
        }
      
        // Build system prompt from active rules in DB
        var $system_prompt {
          value = ""
        }
      
        foreach ($rules) {
          each as $r {
            var.update $system_prompt {
              value = $system_prompt ~ $r.sentence ~ "\n"
            }
          }
        }
      
        // Build resume schema object for JSON examples
        var $resume_schema {
          value = {}
            |set:"header":({}
              |set:"name":"FULL NAME CAPS"
              |set:"title":$last_position_title_for_prompt
              |set:"location":"City, State"
              |set:"email":"..."
              |set:"phone":"..."
              |set:"linkedin":({}
                |set:"display":"linkedin.com/in/slug"
                |set:"url":"https://full-url/"
              )
            )
            |set:"summary":"Results-driven [job title] with X[today (search in google) - first company's start date]+ years..."
            |set:"skills":([]
              |push:({}
                |set:"category":"Label"
                |set:"values":"Skill1, Skill2"
              )
            )
            |set:"career_breakdowns":([]
              |push:({}
                |set:"company":"Name"
                |set:"title":"Most Recent Title"
                |set:"date_range":"Mon YYYY - Mon YYYY"
                |set:"location":"Work location, leave blank if not exist"
                |set:"promotion_note":"Promotion note for special cases, otherwise leave blank"
                |set:"company_summary":"italic company description with bold tools inline."
                |set:"highlights":([]
                  |push:"bullet tool action result."
                )
                |set:"tech_stack":"Tool1, Tool2"
              )
            )
            |set:"education":([]
              |push:({}
                |set:"degree":"Full Degree"
                |set:"institution":"University"
                |set:"year":"YYYY"
              )
            )
            |set:"certifications":([]
              |push:({}
                |set:"name":"Cert Name"
                |set:"issuer":"Body"
                |set:"value_proposition":"Why relevant to this JD."
              )
            )
            |set:"key_projects":([]
              |push:({}
                |set:"name":"Name: Subtitle"
                |set:"context":"Company | Year"
                |set:"description":"Narrative bold terms."
                |set:"tech":"Tool1, Tool2"
              )
            )
            |set:"awards_recognition":([]
              |push:({}
                |set:"name":"Award: Subtitle"
                |set:"context":"Company | Year"
                |set:"description":"One sentence bold impact."
              )
            )
        }
      
        var $result_schema {
          value = {}
            |set:"resume":$resume_schema
            |set:"cover_letter":"<full tailored cover letter as HTML>"
        }
      
        var $claude_auth {
          value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
        }
      
        var $response_text {
          value = ""
        }
      
        try_catch {
          try {
            api.request {
              url = "https://api.anthropic.com/v1/messages"
              method = "POST"
              params = {}
                |set:"model":"claude-haiku-4-5"
                |set:"max_tokens":6000
                |set:"system":$system_prompt
                |set:"messages":([]
                  |push:({}
                    |set:"role":"user"
                    |set:"content":"Generate a full tailored resume and cover letter.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($input.job_description) ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ ($result_schema|json_encode) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
                  )
                )
              headers = []
                |push:"Content-Type: application/json"
                |push:$claude_auth
                |push:"anthropic-version: 2023-06-01"
              timeout = 300
            } as $ai_resp
          
            var.update $response_text {
              value = $ai_resp.response.result.content|first|get:"text"
            }
          
            // Save resume/cover letter content for reference
            db.add resume_content {
              enforce_hidden_fields = false
              data = {raw_response: $response_text}
            } as $content_record
          
            var.update $resume_content_id {
              value = $content_record.id
            }
          
            // ==================== END TOKEN ACCUMULATION ====================
          
            // Parse JSON response (robust cleanup for code-fences / wrappers)
            var $clean_response {
              value = $response_text
                |replace:"```json\n":""
                |replace:"```JSON\n":""
                |replace:"```\n":""
                |replace:"```":""
                |trim
            }
          
            // Try parsing JSON; if it fails, remove last character and retry
            var $parsed_response {
              value = null
            }
          
            try_catch {
              try {
                // First attempt: parse cleaned response as-is
                var.update $parsed_response {
                  value = $clean_response|json_decode
                }
              }
            
              catch {
                // Second attempt: remove last character (common extra trailing brace issue)
                var $trimmed_response {
                  value = $clean_response|regex_replace:".$":""|trim
                }
              
                try_catch {
                  try {
                    var.update $parsed_response {
                      value = $trimmed_response|json_decode
                    }
                  }
                
                  catch {
                    // JSON is truly invalid — $parsed_response stays null, handled below
                    debug.log {
                      value = "JSON parse failed after second attempt: " ~ $error
                    }
                  }
                }
              }
            }
          
            // ==================== PARSE AI RESPONSE ====================
            // Status codes: 1=match, 0=mismatch, 2=unfit, 3=not_job_description, 6=ai_error
            // Only status=match gets resume/cover_letter content.
            // AI sometimes returns resume content even for non-match - we discard it server-side.
          
            conditional {
              if ($parsed_response == null) {
                // JSON parsing failed completely
                var.update $match_status {
                  value = 6
                }
              
                var.update $error_msg {
                  value = "AI processing error: received an invalid response. Please try again."
                }
              }
            
              else {
                var.update $match_status {
                  value = 1
                }
              
                var.update $resume_text {
                  value = $parsed_response.resume|json_encode
                }
              
                var.update $cover_letter_text {
                  value = $parsed_response.cover_letter
                }
              }
            }
          }
        
          catch {
            debug.log {
              value = "AI call failed: " ~ $error
            }
          
            var.update $match_status {
              value = 6
            }
          
            var.update $error_msg {
              value = "AI processing error: " ~ $error ~ ". Please try again."
            }
          }
        }
      
        var.update $resume_filename {
          value = $prof.full_name ~ ".pdf"
        }
      
        var.update $cover_letter_filename {
          value = $prof.full_name ~ " - Cover Letter.pdf"
        }
      
        var.update $input_tokens {
          value = $ai_resp.response.result.usage|get:"input_tokens"
        }
      
        var.update $output_tokens {
          value = $ai_resp.response.result.usage|get:"output_tokens"
        }
      }
    }
  
    conditional {
      if ($input.force_generate) {
        db.edit generation_log {
          field_name = "id"
          field_value = $input.log_id
          enforce_hidden_fields = false
          data = {
            input_tokens : $input_tokens
            output_tokens: $output_tokens
            content_id   : $resume_content_id
            is_applied   : true
          }
        } as $log
      }
    
      else {
        db.add generation_log {
          enforce_hidden_fields = false
          data = {
            profile_id           : $input.profile_id
            user_id              : $access.user_id
            job_url              : $input.job_url
            job_description      : $input.job_description
            input_tokens         : $input_tokens
            output_tokens        : $output_tokens
            resume_filename      : $resume_filename
            cover_letter_filename: $cover_letter_filename
            position_title       : $position_title
            company_name         : $company_name
            is_regenerated       : 0
            is_matched           : $match_status
            match_reason         : $error_msg
            seniority            : $seniority_txt
            tech_scope           : $tech_scope_txt
            content_id           : $resume_content_id
          }
        } as $log
      }
    }
  }

  response = {
    log_id               : $log.id
    is_matched           : $match_status
    match_status         : $match_status
    match_reason         : $error_msg
    error_msg            : $error_msg
    resume_text          : $resume_text
    cover_letter_text    : $cover_letter_text
    resume_filename      : $resume_filename
    cover_letter_filename: $cover_letter_filename
  }
}