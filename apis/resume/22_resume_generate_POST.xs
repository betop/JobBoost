// Generate resume and cover letter for a job description
// v4.4: table schema fix — content_id is now nullable UUID so db.add works without providing it
// Blocked if profile is not approved
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
  
    var $extraction_input_tokens {
      value = 0
    }
  
    var $extraction_output_tokens {
      value = 0
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
    } as $prof
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    precondition ($prof.is_approved) {
      error_type = "accessdenied"
      error = "Profile is not approved. Please contact your admin."
    }
  
    var $use_legacy_api {
      value = ($prof.use_legacy_api|json_encode) == "true"
    }
  
    var $log {
      value = {}
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
      if ($use_legacy_api) {
        // Profile has legacy mode enabled — proxy this request to the legacy generation
        // endpoint (rule-table-driven prompt) instead of running the logic below.
        api.request {
          url = "https://api.shsws-solutions.com/api:caf8Eo15/resume/generate_legacy"
          method = "POST"
          params = {}
            |set:"profile_id":$input.profile_id
            |set:"job_description":$input.job_description
            |set:"token":$input.token
            |set:"job_url":$input.job_url
            |set:"extension_version":$input.extension_version
            |set:"force_generate":$input.force_generate
            |set:"log_id":$input.log_id
          headers = []
            |push:"Content-Type: application/json"
          timeout = 300
        } as $legacy_resp
      
        var.update $log {
          value = {id: $legacy_resp.response.result.log_id}
        }
      
        var.update $match_status {
          value = $legacy_resp.response.result.match_status
        }
      
        var.update $error_msg {
          value = $legacy_resp.response.result.match_reason
        }
      
        var.update $resume_text {
          value = $legacy_resp.response.result.resume_text
        }
      
        var.update $cover_letter_text {
          value = $legacy_resp.response.result.cover_letter_text
        }
      
        var.update $resume_filename {
          value = $legacy_resp.response.result.resume_filename
        }
      
        var.update $cover_letter_filename {
          value = $legacy_resp.response.result.cover_letter_filename
        }
      }
    
      else {
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
              
                // try_catch {
                //   try {
                //     api.request {
                //       url = "https://api.openai.com/v1/chat/completions"
                //       method = "POST"
                //       params = {}
                //         |set:"model":"gpt-4o-mini"
                //         |set:"max_tokens":400
                //         |set:"messages":([]
                //           |push:({}
                //             |set:"role":"user"
                //             |set:"content":"Extract json object ({\n\"is_job_posting\": \"true or false\",\n\"company\": \"full company name or ''\",\n\"position\": \"full position title or ''\",\n\"is_remote\": \"true or false\",\n\"travels_or_relocation_required\": \"true or false\",\n\"is_similar_to_outlier\": \"true or false\",\n\"is_freelancer_marketplace_similar_to_toptal\": \"true or false\",\n\"clearance_required\": \"true or false\",\n\"seniority\": \"either intern, entry, junior, mid, senior, lead, staff, principal, manager, director, vice_president, c_level or founder\",\n\"tech_scope\": \"either ai, machine_learning, data_science, data_analytics, data_engineering, data_research, computer_vision, mlops, generative_ai, ai_security, ai_product, ai_research, edge_ai, speech_ai, recommendation_systems, knowledge_systems, full_stack_ai, backend_ai, frontend_ai, ai_software_engineering, software_engineering, full_stack, backend, frontend or devops. Use machine_learning for deep learning and reinforcement learning roles. Use ai for NLP roles unless another category fits better.\"\n}) from this job description.\n\nJob Description:\n" ~ $input.job_description ~ "\n\nseniority and tech_scope must have only 1 value. Return only JSON. No explanations. No markdown. No additional text."
                //           )
                //         )
                //       headers = []
                //         |push:"Content-Type: application/json"
                //         |push:"Authorization: " ~ $openai_auth
                //     } as $extraction_resp
              
                //   var.update $extraction_text {
                //     value = $extraction_resp.response.result.choices
                //       |first
                //       |get:"message"
                //       |get:"content"
                //       |trim
                //   }
                // }
              
                //   catch {
                //     debug.log {
                //       value = "OpenAI extraction failed: " ~ $error
                //     }
                //   }
                // }
              
                try_catch {
                  try {
                    api.request {
                      url = "https://api.anthropic.com/v1/messages"
                      method = "POST"
                      params = {}
                        |set:"model":"claude-haiku-4-5"
                        |set:"max_tokens":400
                        |set:"messages":([]
                          |push:({}
                            |set:"role":"user"
                            |set:"content":"Extract json object ({\n\"is_job_posting\": \"true or false\",\n\"company\": \"full company name or ''\",\n\"position\": \"full position title or ''\",\n\"is_remote\": \"true or false\",\n\"travels_or_relocation_required\": \"true or false\",\n\"is_similar_to_outlier\": \"true or false\",\n\"is_freelancer_marketplace_similar_to_toptal\": \"true or false\",\n\"clearance_required\": \"true or false\",\n\"seniority\": \"one of intern, entry, junior, mid, senior, lead, staff, principal, manager, director, vice_president, c_level or founder\",\n\"tech_scope\": \"one of ai, machine_learning, data_science, data_analytics, data_engineering, data_research, computer_vision, mlops, generative_ai, ai_security, ai_product, ai_research, edge_ai, speech_ai, recommendation_systems, knowledge_systems, full_stack_ai, backend_ai, frontend_ai, ai_software_engineering, software_engineering, full_stack, backend, frontend or devops. Use machine_learning for deep learning and reinforcement learning roles. Use ai for NLP roles unless another category fits better.\"\n}) from this job description.\n\nJob Description:\n" ~ $input.job_description ~ "\n\nseniority and tech_scope must have only 1 value. Return only JSON. No explanations. No markdown. No additional text."
                          )
                        )
                      headers = []
                        |push:"Content-Type: application/json"
                        |push:$claude_auth
                        |push:"anthropic-version: 2023-06-01"
                      timeout = 300
                    } as $extraction_resp
                  
                    var.update $extraction_text {
                      value = $extraction_resp.response.result.content|first|get:"text"
                    }
                  
                    var.update $extraction_input_tokens {
                      value = $extraction_resp.response.result.usage
                        |get:"input_tokens"
                        |first_notnull:0
                    }
                  
                    var.update $extraction_output_tokens {
                      value = $extraction_resp.response.result.usage
                        |get:"output_tokens"
                        |first_notnull:0
                    }
                  }
                
                  catch {
                    debug.log {
                      value = "AI call failed: " ~ $error
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
                  
                    var.update $extraction_json {
                      value = null
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
                  
                    // Company blacklist check — if the extracted company is on the
                    // blacklist, skip generation (reuses match_status 2, the existing
                    // "job unfit" status, so no extension changes are needed).
                    var $is_blacklisted_company {
                      value = false
                    }
                  
                    db.query blacklisted_company {
                      return = {type: "list"}
                    } as $blacklist_list
                  
                    foreach ($blacklist_list) {
                      each as $bl {
                        conditional {
                          if (($bl.name|to_lower|trim) == ($company_name|to_lower|trim)) {
                            var.update $is_blacklisted_company {
                              value = true
                            }
                          }
                        }
                      }
                    }
                  
                    conditional {
                      if ($is_blacklisted_company) {
                        var.update $match_status {
                          value = 2
                        }
                      
                        var.update $error_msg {
                          value = "This company (" ~ $company_name ~ ") is on your blacklist. Skipping this application."
                        }
                      }
                    
                      else {
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
      
        conditional {
          if ($should_generate || $input.force_generate) {
            db.query education {
              where = $db.education.profile_id == $prof.id
              sort = {education.start_date: "asc"}
              return = {type: "list"}
            } as $education
          
            // DISABLED — system prompt moved to a hardcoded value below. Kept for rollback reference.
            // db.query rule {
            //   where = $db.rule.is_active == true
            //   sort = {rule.created_at: "asc"}
            //   return = {type: "list"}
            // } as $rules
          
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
          
            //  DISABLED — was: build system prompt from active rules in DB. Kept for rollback reference.
            //  var $system_prompt {
            //    value = ""
            //  }
            // 
            //  foreach ($rules) {
            //    each as $r {
            //      var.update $system_prompt {
            //        value = $system_prompt ~ $r.sentence ~ "\n"
            //      }
            //    }
            //  }
          
            // System prompt hardcoded directly in the backend (moved off the DB `rule` table).
            // This endpoint generates BOTH the resume and the cover letter in one call, so both
            // rule sets are combined into a single system prompt.
            var $resume_system_prompt {
              value = """
                You are a deterministic resume generation engine.
                
                You MUST return EXACTLY ONE valid JSON object.
                You MUST NOT output explanations.
                You MUST NOT output markdown.
                You MUST NOT output text outside JSON.
                You MUST NOT output multiple JSON objects.
                
                If ANY rule is violated, you MUST regenerate internally before returning output.
                
                ========================================================
                GLOBAL STRUCTURE RULE — ENTIRE RESUME
                ========================================================
                
                The resume JSON object MUST contain ALL of the following sections:
                
                - header
                - career_breakdowns
                - education
                - certifications
                - portfolio_projects
                - leadership_enterpreneurial_experience
                - technical_skills
                
                If ANY section is missing, renamed, incomplete, or structurally altered, you MUST regenerate.
                
                ========================================================
                JOB DESCRIPTION TAILORING RULE — ENTIRE RESUME
                ========================================================
                
                The entire resume MUST be tailored to the provided job description.
                
                1. technical_skills MUST prioritize the tools, languages, and platforms that appear in the job description, drawn only from the candidate's real experience.
                2. Bullets, portfolio_projects, and leadership_enterpreneurial_experience entries MUST emphasize work relevant to the job description over unrelated work.
                3. Bullets in the current or most relevant career_breakdowns entry MUST reflect most — not necessarily all — of the responsibilities listed in the job description's Responsibilities section, restated in the candidate's own words and grounded in their real experience. Do NOT copy job description language verbatim.
                4. The resume MUST reflect most of the qualifications/requirements listed in the job description. Required qualifications MUST be reflected wherever the candidate's real experience supports them; preferred qualifications MAY be included but are not mandatory. Not every listed qualification needs to appear.
                5. This applies EVERYWHERE in the output, not just career_breakdowns bullets — including portfolio_projects, leadership_enterpreneurial_experience, and the cover letter: do NOT reuse distinctive job description verbs/phrases such as "leverage"/"high leverage", "harden"/"hardening", "own it end to end", or similarly specific wording. Paraphrase with different vocabulary throughout. Tool and technology names (e.g. "AI development tools", "coding agents", "Elixir") are exempt from this — only stylistic/descriptive phrasing must be paraphrased. Before returning the JSON, scan the ENTIRE output text (all sections plus the cover letter) for the literal substrings "harden", "hardening", and "leverage" — if any are found, rewrite that sentence with a different word.
                6. You MUST:
                   - NOT Invent skills or experience not evidenced by the candidate profile just to match the job description.
                
                If the resume is not clearly tailored to the job description, you MUST regenerate.
                
                ========================================================
                COMPANY CONSOLIDATION RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                If multiple roles share the same company name:
                1. If the internship was completed during your time at university, it should be removed from the career breakdown list.
                2. There MUST NOT be duplicate company entries.
                3. There MUST NOT be multiple entries with identical company names.
                4. All roles from the same company MUST be merged into ONE single career_breakdowns entry.
                5. The Title MUST be the title of the most recent role held at that company.
                6. The Period MUST cover the entire time at that company, starting from the first date the candidate joined the company and ending at Present if still employed there, or the final date they left the company.
                7. End date in the last company MUST be always "Present"
                
                If consolidation fails, you MUST regenerate.
                
                ========================================================
                BOLD RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                Define:
                
                CATEGORY_A = Programming languages, frameworks, cloud services, databases, platforms.
                CATEGORY_B = Soft skills, methodologies, regulatory terms, outcomes.
                
                Rules:
                
                1. Do NOT bold CATEGORY_A tools, technology keywords, tool names, programming languages, frameworks, or platforms anywhere in the resume.
                2. technical_skills values MUST:
                   - NOT Contain bold formatting.
                3. You MUST:
                   - NOT Bold metrics.
                   - NOT Bold numeric values.
                   - NOT Bold regulatory terms.
                   - NOT Bold soft skills.
                   - NOT Use any bold formatting (** markers) anywhere in bullets, portfolio_projects, or leadership_enterpreneurial_experience descriptions.
                
                If any bold formatting is present anywhere in the resume, you MUST regenerate.
                
                ========================================================
                BULLET RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                Each bullet MUST:
                
                1. Follow the STAR method (Situation, Task, Activity, Result).
                2. Contain at least one CATEGORY_A tool.
                3. Be strictly technical, aligned to the current position (profile title), and prioritized toward what the job description asks for.
                4. Describe engineering implementation work.
                5. Use varied sentence structure and opening verbs — do NOT repeat the same "[verb] + [what], [metric] by/through [method]" pattern on every bullet within a position. Vary phrasing so bullets read like they were written by a person, not generated from a template.
                6. Paraphrase job description responsibilities with different wording and sentence structure than the job description itself, even when covering the same responsibility — do NOT closely mirror or restate distinctive JD phrases. In particular, do NOT reuse distinctive JD verbs/phrases such as "leverage"/"high leverage", "harden"/"hardening", "own it end to end", or similarly specific wording — use different synonyms even when describing the same activity (e.g. "use AI-assisted coding tools" or "adopt AI development tools" instead of "leverage AI tools", "validate and refine" instead of "harden").
                
                Metrics:
                - In a position with 3 bullets, AT MOST 2 of the 3 may include a metric — AT LEAST 1 bullet MUST be purely qualitative (scope, technique, collaboration, or impact described in words, with NO number). In a position with 5 bullets, AT MOST 3 of the 5 may include a metric.
                - Do NOT put a metric on every single bullet within a position, and do NOT put a metric on every single bullet across the entire resume — that reads as fabricated. Vary which bullets carry a number and vary the type of metric used (not every metric should be a round percentage).
                - Metrics MUST be plausible for the role, company size, and seniority level — avoid inflated, suspiciously large, or suspiciously precise claims (e.g. no "99.9% uptime" or "50% reduction" on a bullet from a junior or mid-level individual contributor role unless clearly justified by the work described).
                - Avoid absolute/unfalsifiable claims such as "zero data loss", "100% uptime", or "no incidents" — use measured, realistic language instead (e.g. "without a reported data-loss incident", "maintained high reliability").
                - Do NOT restate the same accomplishment (same project, initiative, or numbers) in more than one place in the resume — each real accomplishment appears once, with one consistent set of facts. This applies especially between career_breakdowns and leadership_enterpreneurial_experience.
                
                Bullet counts:
                - The current/most recent position MUST have more bullets than every former position (5 bullets is a good target).
                - EVERY former (non-current) position that is NOT an internship MUST have EXACTLY 3 bullets. This applies uniformly to ALL former positions — the 2nd most recent, the 3rd, the 4th, and every position after that — with NO exceptions and NO gradual reduction as positions get older. A 5th or 6th career_breakdowns entry MUST have exactly 3 bullets just like the 2nd entry does.
                - Internship positions are exempt from the 3-bullet minimum and MAY have fewer.
                - Before returning the JSON, go through career_breakdowns one entry at a time in order and count its bullets. If any former non-internship entry has fewer than 3 bullets, add bullets to that entry until it has exactly 3.
                
                If STAR structure is not followed, every bullet in a position shares the same sentence template, a bullet closely mirrors job description phrasing, or ANY former non-internship position (regardless of how far back it is) has fewer than 3 bullets, you MUST regenerate.
                
                ========================================================
                TITLE INTEGRITY RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                If role title contains "Intern" or "Junior":
                
                You MUST:
                   - NOT Use verbs such as led, architected, owned, directed, managed.
                
                If role title contains "Senior", "Lead", or "Staff":
                
                You MUST:
                   - NOT Use verbs such as assisted, helped.
                
                If verb usage does not align with seniority level, regenerate that bullet.
                
                ========================================================
                COMPANY LOCATION RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                Work experience entries look like this -> position title | company name | work location | date range | promotion note.
                Split them with "|" and write your experience for the career breakdowns as following ->
                career_breakdowns: {
                  ...
                  location: split_result[2],
                }
                You MUST not make changes to these values even though there is either no values or spell issue. Just ensure it is same as written in the user prompt. If not, regenerate the response again.
                
                ========================================================
                DATE FORMAT RULE — WORK EXPERIENCE SECTION
                ========================================================
                
                career_breakdowns date_range MUST use abbreviated month name plus full year only.
                
                Format: "Mon YYYY - Mon YYYY", or "Mon YYYY - Present" if still employed there.
                Example: "Aug 2015 - Apr 2017".
                
                You MUST:
                   - NOT Use full month names.
                   - NOT Include day numbers.
                   - NOT Use numeric month/date formats.
                
                If date_range does not follow this format, you MUST regenerate.
                
                ========================================================
                EDUCATION RULE — EDUCATION SECTION
                ========================================================
                
                Education entries MUST be ordered with the most recently attended institution first.
                
                The highlights field MUST include accolades, honors, or extracurricular activities from that institution when known from the candidate profile.
                The Relevant field MUST include coursework relevant to the candidate's target position.
                
                You MUST:
                   - NOT Fabricate accolades, honors, or coursework not evidenced by the candidate profile.
                
                If order incorrect, regenerate education section.
                
                ========================================================
                CERTIFICATIONS RULE — CERTIFICATIONS SECTION
                ========================================================
                
                There MUST be between 1 and 3 certifications. This section MUST NOT be left empty.
                
                The candidate profile does not include a list of real certifications, so you MUST generate plausible certifications by choosing:
                1. Certifications explicitly named in the job description, if consistent with the candidate's seniority and background, or otherwise
                2. Well-known, real, industry-standard certifications closely related to the job description's technologies, platforms, or domain, that a professional at the candidate's seniority level would plausibly hold (e.g. AWS Certified Solutions Architect, Microsoft Certified: Azure Developer Associate, PMP, Certified ScrumMaster, CompTIA Security+, Google Professional Data Engineer).
                
                Each certification MUST include:
                - name
                - issuer
                - date
                
                You MUST:
                   - Use ONLY real, well-known certifying organizations as the issuer (e.g. AWS, Microsoft, Google, PMI, Scrum Alliance, CompTIA, Cisco) — NOT a fabricated or unknown organization.
                   - Use a plausible past date consistent with the candidate's career timeline (not in the future, not before the candidate's career began).
                   - NOT Include numeric metrics.
                   - NOT invent obscure or fictional certifications or organizations.
                
                ========================================================
                PORTFOLIO PROJECTS RULE — PORTFOLIO PROJECTS SECTION
                ========================================================
                
                There MUST be no more than 4 projects.
                
                Each project:
                - Must be derived from real work experience (profile career - company).
                - Must be a core idea. (e.g. Doctors want to search specific patients data from database using query like "Show me patients data between Jan - Mar this year")
                - Name MUST follow format:
                  "[Name of Project] ([Technologies/Methodologies used])"
                - Description MUST repeat the STAR method, emphasizing the technologies/methodologies used, and MUST develop the analysis and conclusion/results from it with a concrete metric or measurable outcome wherever the underlying work supports one.
                - You MUST:
                   - NOT Fabricate projects.
                   - NOT Fabricate metrics not evidenced by the candidate profile.
                
                ========================================================
                LEADERSHIP / ENTREPRENEURIAL EXPERIENCE RULE — LEADERSHIP_ENTERPRENEURIAL_EXPERIENCE SECTION
                ========================================================
                
                There MUST be no more than 3 leadership_enterpreneurial_experience entries.
                
                Each entry:
                - Must derive from real described work already reflected in career_breakdowns — it MUST be a deeper, more specific extension of something the candidate actually did at one of their real employers, not a separate, invented initiative.
                - The entry's "role" label (e.g. Lead Engineer, Technical Lead, Project Lead) MUST NOT imply a job title, seniority, or scope of authority beyond what the candidate's actual job_title at that company supports. If the candidate's real title at that company was an individual-contributor title (e.g. Software Engineer, Junior Software Engineer), frame the entry as a specific initiative or contribution the candidate drove within that role — do NOT imply they held a formal leadership title they did not have.
                - MUST NOT restate an accomplishment already described in a career_breakdowns bullet for that company — this includes reusing the SAME metric/number from that bullet (e.g. if a career_breakdowns bullet already says "reduced production incidents by 25%", the leadership entry MUST NOT repeat "25%" or "incidents" again). If related to a career_breakdowns bullet, the leadership entry must cover a genuinely different angle (e.g. how the initiative was designed or rolled out) with, at most, a DIFFERENT metric — or no metric at all.
                - Must emphasize the candidate's responsibilities and the measurable results of their involvement, quantified ONLY wherever the underlying work genuinely supports it — not every entry needs a metric, and a metric MUST be consistent with (not contradict) any related number used elsewhere in the resume.
                - You MUST:
                   - NOT Fabricate leadership roles, titles, or scope of authority not evidenced by the candidate's real job title and career_breakdowns.
                   - NOT Fabricate metrics not evidenced by the candidate profile.
                   - NOT Duplicate an accomplishment already stated in career_breakdowns.
                
                Before returning the JSON, for every number that appears in a leadership_enterpreneurial_experience entry, search all career_breakdowns bullets for that same company for the exact same number. If you find the same number reused, remove it from the leadership entry or replace it with a different, non-duplicated metric.
                
                ========================================================
                FINAL VALIDATION — ENTIRE RESUME
                ========================================================
                
                Before returning JSON, you MUST verify:
                
                - Resume is tailored to the job description (technical_skills, bullets, portfolio_projects, and leadership entries emphasize relevant work).
                - No duplicate company entries.
                - Company consolidation correct. start_date and end_date correct.
                - Current/most recent position has more bullets than earlier positions.
                - Every non-internship former position has exactly 3 bullets — checked individually, including the 3rd, 4th, and any later entries, not just the 2nd.
                - Every bullet follows STAR; at most 2 of 3 (or 3 of 5) bullets per position include a metric, at least one bullet per position is purely qualitative; no two bullets in the same position share the same sentence template; no bullet closely mirrors job description phrasing or reuses distinctive JD verbs like "leverage" or "harden".
                - No absolute/unfalsifiable claims ("zero data loss", "100% uptime", "no incidents").
                - Portfolio project and leadership descriptions include measurable results where the underlying work supports it.
                - No bold formatting (** markers) appears anywhere in the resume.
                - Certifications section has between 1 and 3 entries — NOT empty — each with a real, well-known issuer relevant to the job description.
                - Portfolio projects count is 4 or fewer.
                - Leadership entries count is 3 or fewer; each leadership entry's role label matches the seniority/scope of the candidate's real job_title at that company; no number in a leadership entry is reused from a career_breakdowns bullet for that same company.
                - The literal substrings "harden", "hardening", and "leverage" do NOT appear anywhere in the output (resume or cover letter).
                - Education entries ordered most recent first.
                - No em dashes anywhere.
                
                If ANY condition fails, regenerate internally before returning output.
                Return only fully compliant JSON.
                
                Remember today's year is 2026.
                """
            }
          
            var $cover_letter_system_prompt {
              value = """
                You are a structured cover letter generation engine.
                
                Structure:
                
                1. Greeting:
                Hello, Hiring Team.
                
                2. One Summary Paragraph:
                - 90–130 words.
                - 4–6 sentences.
                - Dense and compressed.
                - No fluff.
                - No storytelling.
                - No em dashes.
                - Mention years experience.
                - Mention technical stack aligned to JD.
                - Mention specialization.
                - Mention scalable/production systems.
                
                3. Closing Paragraph:
                - 2–3 short sentences.
                - Max 40 words.
                - Direct and confident.
                
                4. Signature:
                Best Regards,
                [Full Name]
                
                Total letter ≤ 160 words.
                
                Validation:
                - No sentence > 30 words.
                - No filler language.
                - No company praise fluff.
                - No em dashes.
                - Do NOT reuse distinctive job description verbs/phrases such as "leverage"/"high leverage", "harden"/"hardening", "own it end to end", or similarly specific wording — paraphrase with different vocabulary.
                
                Regenerate if violated.
                """
            }
          
            var $system_prompt {
              value = $resume_system_prompt ~ "\n\n" ~ $cover_letter_system_prompt
            }
          
            // Resume JSON schema example, hardcoded directly as a string (no Xano object construction).
            var $resume_schema {
              value = """
                {
                  "header": {
                    "name": "[NAME IN CAPS]",
                    "location": "[City, State]",
                    "email": "[Gmail]",
                    "phone": "[Phone #]",
                    "linkedin": {
                      "display": "in/[username]",
                      "url": "https://www.linkedin.com/in/[username]"
                    }
                  },
                  "career_breakdowns": [
                    {
                      "company": "[Current Company]",
                      "title": "[Current Position]",
                      "date_range": "[Mon YYYY - Mon YYYY, or Mon YYYY - Present if current. Use 3-letter month abbreviations only, e.g. Aug 2015 - Apr 2017]",
                      "location": "[City, State]",
                      "bullets": [ // STAR method bullets - Situation Task Activity Result - incorporate metrics
                        "[Bullet point 1 > Incorporate metrics]",
                        "[Bullet point 2 > Incorporate metrics]",
                        "[Bullet point 3 > Incorporate metrics]",
                        "[Bullet point 4 > Incorporate metrics]",
                        "[Bullet point 5 > Max number of bullet points if current position]"
                      ]
                    },
                    {
                      "company": "[Former Company]",
                      "title": "[Former Position]",
                      "date_range": "[Mon YYYY - Mon YYYY, or Mon YYYY - Present if current. Use 3-letter month abbreviations only, e.g. Aug 2015 - Apr 2017]",
                      "location": "[City, State]",
                      "bullets": [ // STAR method bullets - Situation Task Activity Result - incorporate metrics
                        "[Bullet point 1 > Incorporate metrics]",
                        "[Bullet point 2 > Incorporate metrics]",
                        "[Bullet point 3 > Max number of bullet points if former position]"
                      ]
                    }
                    // ...additional career_breakdowns entries as needed
                  ],
                  "education": [
                    {
                      "institution": "[University]",
                      "degree": "[DEGREE IN CAPS]",
                      "location": "[City, State]",
                      "major": "[Major]",
                      "highlights": "[Include accolades, highlights and extracurricular activities from college years | e.g. Student-Athlete | Teacher Assistant | xxx Scholarship/Grant]",
                      "Relevant": "[Include classes related to your desired position/field/industry | e.g. Calculus II | Introduction to Python]"
                    }
                    // ...additional education entries as needed
                  ],
                  "certifications": [ // Max 2-3
                    {
                      "name": "[Cert Name]",
                      "issuer": "[Issuer Name]",
                      "date": "[Completion Year]"
                    }
                  ],
                  "portfolio_projects": [ // Max 4
                    {
                      "name": "[Name of Project] ([Technologies/Methodologies used])",
                      "date": "[Project End Date]",
                      "description": "[Repeat STAR method while emphasizing technologies/methodologies used to perform the project > Make sure to develop the analysis and conclusion/results from it]"
                    }
                    // ...additional portfolio_projects entries as needed
                  ],
                  "leadership_enterpreneurial_experience": [ // Max 2-3
                    {
                      "name": "[Name of Project/Responsibility]",
                      "role": "[Role in the project]",
                      "date": "[Project End Date]",
                      "description": "[Emphasize your responsibilities as a leader/entrepreneur as well as the results of your involvement/actions]"
                    }
                    // ...additional leadership_enterpreneurial_experience entries as needed
                  ],
                  "technical_skills": { // Shift focus to functional/technical depending on desired role
                    "programming": "xxx, xxx, etc.",
                    "softwares": "xxx, xxx, etc.",
                    "statistics_and_ml": "xxx, xxx, etc.",
                    "project_management": "xxx, xxx, etc.",
                    "languages": "xxx, xxx, etc."
                  }
                }
                """
            }
          
            // Include/omit optional sections based on profile preferences.
            // The schema itself is now a static string (see $resume_schema below), so this only
            // controls the trailing "do not include" instruction, not schema-object mutation.
            var $include_key_projects_flag {
              value = ($prof.include_key_projects|json_encode) != "false"
            }
          
            var $include_certifications_flag {
              value = ($prof.include_certifications|json_encode) != "false"
            }
          
            // Build omit instruction for the AI prompt
            var $omit_sections_list {
              value = []
            }
          
            conditional {
              if (!$include_key_projects_flag) {
                array.push $omit_sections_list {
                  value = "portfolio_projects"
                }
              }
            }
          
            conditional {
              if (!$include_certifications_flag) {
                array.push $omit_sections_list {
                  value = "certifications"
                }
              }
            }
          
            var $omit_instruction {
              value = ""
            }
          
            conditional {
              if (($omit_sections_list|count) > 0) {
                var.update $omit_instruction {
                  value = "\n\nIMPORTANT: Do NOT include these sections in the resume JSON: " ~ ($omit_sections_list|join:", ") ~ ". Leave them out entirely."
                }
              }
            }
          
            // Build profile contact lines — only include fields that are non-empty
            var $profile_contact_section {
              value = ""
            }
          
            conditional {
              if ($prof.email != null && $prof.email != "") {
                var.update $profile_contact_section {
                  value = $profile_contact_section ~ "\nEmail: " ~ $prof.email
                }
              }
            }
          
            conditional {
              if ($prof.phone_number != null && $prof.phone_number != "") {
                var.update $profile_contact_section {
                  value = $profile_contact_section ~ "\nPhone: " ~ $prof.phone_number
                }
              }
            }
          
            conditional {
              if ($prof.location != null && $prof.location != "") {
                var.update $profile_contact_section {
                  value = $profile_contact_section ~ "\nLocation: " ~ $prof.location
                }
              }
            }
          
            conditional {
              if ($prof.linkedin_url != null && $prof.linkedin_url != "") {
                var.update $profile_contact_section {
                  value = $profile_contact_section ~ "\nLinkedIn: " ~ $prof.linkedin_url
                }
              }
            }
          
            conditional {
              if ($prof.github_url != null && $prof.github_url != "") {
                var.update $profile_contact_section {
                  value = $profile_contact_section ~ "\nGitHub: " ~ $prof.github_url
                }
              }
            }
          
            var $result_schema {
              value = "{\n  \"resume\": " ~ $resume_schema ~ ",\n  \"cover_letter\": \"<full tailored cover letter as HTML>\"\n}"
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
                        |set:"content":"Generate a full tailored resume and cover letter.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ $profile_contact_section ~ " (keep it empty for missing fields )\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($input.job_description) ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ $result_schema ~ $omit_instruction ~ "\n\nReturn only JSON and generate values only defined in the JSON. No explanations. No markdown. No additional text."
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
              value = ```
                ($ai_resp.response.result.usage
                            |get:"input_tokens"
                            |first_notnull:0) + $extraction_input_tokens
                ```
            }
          
            var.update $output_tokens {
              value = ```
                ($ai_resp.response.result.usage
                            |get:"output_tokens"
                            |first_notnull:0) + $extraction_output_tokens
                ```
            }
          }
        }
      
        conditional {
          if ($input.force_generate) {
            db.edit generation_log {
              field_name = "id"
              field_value = $input.log_id
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