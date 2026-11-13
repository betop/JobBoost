// Generate resume and cover letter for a job description
// v4.4: table schema fix — content_id is now nullable UUID so db.add works without providing it
// Blocked if profile is not approved
query "resume/generate" verb=POST {
  api_group = "resume"

  input {
    text ai_model?
    uuid profile_id?
    text job_description?
    text token?
    text job_url?
    text extension_version?
    bool force_generate?
    uuid log_id?
    bool skip_cover_letter?
  }

  stack {
    // Model picked in the extension (Haiku 4.5 default; 5.5 cheaper); validated against the selectable list
    function.run "ai/resolve_model" {
      input = {ai_model: null}
    } as $ai_model_id

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
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid key"
    }

    precondition ($access.is_active == true) {
      error_type = "accessdenied"
      error = "Key has been revoked"
    }

    precondition ($access.user_id != null) {
      error_type = "accessdenied"
      error = "Token has no associated user"
    }

    // expires_at is optional: null means the key never expires
    precondition ($access.expires_at == null || $access.expires_at > now) {
      error_type = "accessdenied"
      error = "Key has expired"
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
  
    // Pay-as-you-go credit check — super_admins are exempt; bidders are billed
    // through the profile's billing admin (falls back to the creating admin)
    function.run "credits/check_sufficient_balance" {
      input = {user_id: $user.id, profile_id: $input.profile_id, allow_free_trial: true}
    } as $billing_check
  
    precondition (!$billing_check.is_billable || $billing_check.has_sufficient_balance) {
      error_type = "accessdenied"
      error = "Insufficient credit. The billing admin's credit balance is empty, please top up to continue."
    }

    var $credit_warning {
      value = null
    }

    conditional {
      if ($billing_check.low_balance) {
        var.update $credit_warning {
          value = {message: $billing_check.warning_message, balance: $billing_check.balance}
        }
      }
    }

    // Free trial (new admin accounts): null when not in trial, else remaining count after this request
    var $free_trial_info {
      value = null
    }

    conditional {
      if ($billing_check.free_trial) {
        function.run "credits/free_generation_allowance" {
          input = {}
        } as $free_allowance

        var.update $free_trial_info {
          value = {remaining: $billing_check.free_generations_remaining, total: $free_allowance}
        }
      }
    }
  
    precondition ($user.type == "super_admin" || $user.is_active) {
      error_type = "accessdenied"
      error = "User account is inactive"
    }
  
    // Per-key IP whitelist: empty/null whitelist = any IP allowed
    function.run "security/get_client_ip" {
      input = {}
    } as $request_ip

    function.run "security/ip_in_whitelist" {
      input = {ip: $request_ip, allowed_ips: $access.allowed_ips}
    } as $ip_allowed

    precondition ($ip_allowed) {
      error_type = "accessdenied"
      error = "Generation is not allowed from this IP address"
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

    var $compensation {
      value = ""
    }

    var $extraction_input_tokens {
      value = 0
    }
  
    var $extraction_output_tokens {
      value = 0
    }

    var $extraction_cache_creation_tokens {
      value = 0
    }

    var $extraction_cache_read_tokens {
      value = 0
    }

    // Usage object of the main resume call (stays {} when that call is skipped or throws)
    var $main_usage {
      value = {}
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
    } as $prof

    // The model is a PER-PROFILE setting (admin panel -> profile); unknown/empty -> Haiku 4.5
    function.run "ai/resolve_model" {
      input = {ai_model: $prof.ai_model}
    } as $profile_model

    var.update $ai_model_id {
      value = $profile_model
    }
  
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
        // Call the legacy endpoint on the SAME branch/data source this request runs on
        // (staging must never proxy into the live branch).
        var $legacy_url {
          value = "https://api.shsws-solutions.com/api:caf8Eo15:" ~ $env.$branch ~ "/resume/generate_legacy"
        }

        api.request {
          url = $legacy_url
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
            |push:("X-Data-Source: " ~ $env.$datasource)
          timeout = 300
        } as $legacy_resp
      
        var.update $log {
          value = {id: $legacy_resp.response.result.log_id}
        }
      
        var.update $match_status {
          value = $legacy_resp.response.result.match_status
        }

        var.update $free_trial_info {
          value = $legacy_resp.response.result.free_trial
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
            
            // Per-profile opt-out: when check_duplicate_url is explicitly false, ignore the
            // same-job-URL match so generation continues to the next validations (null/true = check)
            conditional {
              if (($prof.check_duplicate_url|json_encode) == "false") {
                var.update $potential_duplicate {
                  value = null
                }
              }
            }
          
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

                var.update $compensation {
                  value = ($potential_duplicate.compensation != null && $potential_duplicate.compensation != "") ? $potential_duplicate.compensation : $prof.default_compensation
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
                        |set:"model":$ai_model_id
                        |set:"thinking":({}|set:"type":"disabled")
                        |set:"max_tokens":1500
                        |set:"messages":([]
                          |push:({}
                            |set:"role":"user"
                            |set:"content":"Extract json object ({\n\"is_job_posting\": \"true or false\",\n\"company\": \"full company name or ''\",\n\"position\": \"full position title or ''\",\n\"compensation\": \"the salary or pay range as stated in the job description (e.g. '$120K - $150K/yr'), or '' if not mentioned\",\n\"is_remote\": \"true or false\",\n\"travels_or_relocation_required\": \"true or false\",\n\"clearance_required\": \"true or false\",\n\"is_federal_government_employer\": \"true or false - true if the employer is a United States federal government entity (a federal agency, department, or military branch hiring federal employees, e.g. via USAJOBS). Use your own knowledge of the company named in the job description, not only the text, since the posting often does not say so. false for private companies, government contractors, and state or local governments\",\n\"requires_in_person_interview\": \"true or false - true only if the job description states the hiring process includes an in-person, onsite, or in-office interview or meeting (e.g. onsite final round, in-person panel, candidate must come to the office to interview); false if the hiring process is fully remote/virtual or the job description does not mention it\",\n\"primary_language\": \"the primary human language the job description and hiring process are written/conducted in, as a single English word, e.g. English, Spanish, German, French, Portuguese, Italian, Dutch, Polish, Japanese, Chinese\",\n\"seniority\": \"one of intern, entry, junior, mid, senior, lead, staff, principal, manager, director, vice_president, c_level or founder\",\n\"tech_scope\": \"one of ai, machine_learning, data_science, data_analytics, data_engineering, data_research, computer_vision, mlops, generative_ai, ai_security, ai_product, ai_research, edge_ai, speech_ai, recommendation_systems, knowledge_systems, full_stack_ai, backend_ai, frontend_ai, ai_software_engineering, software_engineering, full_stack, backend, frontend or devops. Use machine_learning for deep learning and reinforcement learning roles. Use ai for NLP roles unless another category fits better.\"\n}) from this job description.\n\nJob Description:\n" ~ $input.job_description ~ "\n\nseniority and tech_scope must have only 1 value. Return only JSON. No explanations. No markdown. No additional text."
                          )
                        )
                      headers = []
                        |push:"Content-Type: application/json"
                        |push:$claude_auth
                        |push:"anthropic-version: 2023-06-01"
                      timeout = 300
                    } as $extraction_resp
                  
                    var.update $extraction_text {
                      value = ($extraction_resp.response.result.content|filter:($$.type == "text"))|first|get:"text"
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

                    var.update $extraction_cache_creation_tokens {
                      value = $extraction_resp.response.result.usage
                        |get:"cache_creation_input_tokens"
                        |first_notnull:0
                    }

                    var.update $extraction_cache_read_tokens {
                      value = $extraction_resp.response.result.usage
                        |get:"cache_read_input_tokens"
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
              
                // Models differ: Haiku 4.5 returns "true"/"false" strings, Haiku 5.5 returns JSON booleans.
                // Normalize to the strings the checks below compare against.
                var $bool_val {
                  value = null
                }

                conditional {
                  if ($extraction_json != null) {
                    foreach (["is_job_posting", "is_remote", "travels_or_relocation_required", "clearance_required", "is_federal_government_employer", "requires_in_person_interview"]) {
                      each as $bool_key {
                        var.update $bool_val {
                          value = $extraction_json|get:$bool_key
                        }

                        conditional {
                          // strict: a boolean false must not be treated as null
                          if ($bool_val !== null) {
                            var.update $extraction_json {
                              value = $extraction_json|set:$bool_key:(($bool_val|json_encode)|replace:"\"":"")
                            }
                          }
                        }
                      }
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

                    // Compensation — use the value extracted from the job description if
                    // present, otherwise fall back to the profile's admin-configured default.
                    var.update $compensation {
                      value = ($extraction_json.compensation != null && $extraction_json.compensation != "" && $extraction_json.compensation != "null") ? $extraction_json.compensation : $prof.default_compensation
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
                  
                    // Blocked role-family check — never generate for consultant or
                    // manager positions (matched as a case-insensitive substring of the
                    // extracted position title, e.g. "IT Manager"). Architect roles are
                    // blocked too, but only when this profile has lead-level roles blocked
                    // (the same admin toggle now covers both lead seniority and architect titles).
                    var $blocked_title_families {
                      value = ["consultant", "manager"]
                    }

                    conditional {
                      if ($prof.block_lead_roles == true) {
                        array.push $blocked_title_families {
                          value = "architect"
                        }
                      }
                    }

                    var $is_blocked_title {
                      value = false
                    }

                    foreach ($blocked_title_families) {
                      each as $bt {
                        conditional {
                          if (($position_title|to_lower)|contains:$bt) {
                            var.update $is_blocked_title {
                              value = true
                            }
                          }
                        }
                      }
                    }

                    // In-person hiring process check — never generate for jobs whose
                    // interview process requires an onsite/in-person meeting (reuses
                    // match_status 2, the existing "job unfit" status). Both the string
                    // and boolean forms are accepted since the model may return either.
                    var $requires_in_person_interview {
                      value = $extraction_json.requires_in_person_interview == "true"
                    }

                    // Language check — reject jobs whose primary language is not one of
                    // the languages allowed for this profile (configured in the admin
                    // panel, comma-separated, default "English").
                    var $extracted_language {
                      value = ($extraction_json.primary_language|first_notnull:"English")|trim
                    }

                    var $allowed_languages_list {
                      value = ($prof.allowed_languages|first_notnull:"English")|split:","
                    }

                    var $is_language_allowed {
                      value = false
                    }

                    foreach ($allowed_languages_list) {
                      each as $al {
                        conditional {
                          if (($al|trim|to_lower) == ($extracted_language|to_lower)) {
                            var.update $is_language_allowed {
                              value = true
                            }
                          }
                        }
                      }
                    }

                    // Federal government check: flag comes from the extraction prompt above
                    var $is_federal_company {
                      value = $extraction_json.is_federal_government_employer == "true"
                    }

                    // Max 3 successful submissions to the same company per profile
                    // in a rolling 30-day window (2,592,000 seconds).
                    var $company_cap_secs {
                      value = 2592000
                    }

                    var $company_cap_neg_secs {
                      value = 0 - $company_cap_secs
                    }

                    var $company_window_start {
                      value = now|add_secs_to_timestamp:$company_cap_neg_secs
                    }

                    var $recent_company_submissions {
                      value = 0
                    }

                    conditional {
                      if ($company_name != null && $company_name != "" && $company_name != "null") {
                        db.query generation_log {
                          where = $db.generation_log.profile_id == $prof.id && $db.generation_log.is_matched == 1 && $db.generation_log.created_at >= $company_window_start
                          return = {type: "list"}
                        } as $recent_company_logs

                        foreach ($recent_company_logs) {
                          each as $rcl {
                            conditional {
                              if (($rcl.company_name|to_lower|trim) == ($company_name|to_lower|trim)) {
                                var.update $recent_company_submissions {
                                  value = $recent_company_submissions + 1
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    var $is_company_cap_reached {
                      value = $recent_company_submissions >= 3
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

                      elseif ($is_federal_company) {
                        var.update $match_status {
                          value = 2
                        }

                        var.update $error_msg {
                          value = "This company (" ~ $company_name ~ ") is a federal government employer. Federal government jobs are not supported."
                        }
                      }

                      elseif ($is_company_cap_reached) {
                        var.update $match_status {
                          value = 2
                        }

                        var.update $error_msg {
                          value = "This company (" ~ $company_name ~ ") already has 3 submissions in the last 30 days. Try with another job."
                        }
                      }

                      elseif ($is_blocked_title) {
                        var.update $match_status {
                          value = 2
                        }

                        var.update $error_msg {
                          value = "This position (" ~ $position_title ~ ") is a consultant, manager, or architect role, which is not supported. Skipping this application."
                        }
                      }

                      elseif ($requires_in_person_interview) {
                        var.update $match_status {
                          value = 2
                        }

                        var.update $error_msg {
                          value = "This job requires an in-person or onsite interview during the hiring process. Try with another job."
                        }
                      }

                      elseif (!$is_language_allowed) {
                        var.update $match_status {
                          value = 2
                        }

                        var.update $error_msg {
                          value = "This job's language (" ~ $extracted_language ~ ") is not in your allowed languages list. Try with another job."
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
                                          if ($extraction_json.clearance_required == "false") {
                                            // All seniority levels are allowed by default. Only when this profile
                                            // has lead roles blocked are lead-level and higher jobs rejected.
                                            var $blocked_seniorities {
                                              value = ["lead", "staff", "principal", "director", "vice_president", "c_level", "founder"]
                                            }

                                            var $has_seniority {
                                              value = true
                                            }

                                            conditional {
                                              if ($prof.block_lead_roles == true) {
                                                foreach ($blocked_seniorities) {
                                                  each as $s {
                                                    conditional {
                                                      if (($extraction_json.seniority|to_text|to_lower|trim) == $s) {
                                                        var.update $has_seniority {
                                                          value = false
                                                        }
                                                      }
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
                                                          if (($c|trim) == $extraction_json.tech_scope || ($c|trim) == "all") {
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
                                                  value = "This job's seniority level (" ~ $extraction_json.seniority ~ ") is lead-level or higher, which is blocked for this profile. Try with another job."
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

                    var.update $compensation {
                      value = $prof.default_compensation
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

        var $cache_creation_input_tokens {
          value = 0
        }

        var $cache_read_input_tokens {
          value = 0
        }

        var $resume_content_id {
          value = null
        }
      
        conditional {
          if ($should_generate || $input.force_generate) {
    db.query certification {
      where = $db.certification.profile_id == $prof.id
      sort = {certification.created_at: "asc"}
      return = {type: "list"}
    } as $user_certs

    // Candidate-provided certifications, one per line (empty = the AI proposes them as before)
    var $cert_text {
      value = ""
    }

    foreach ($user_certs) {
      each as $uc {
        var.update $cert_text {
          value = $cert_text ~ "- " ~ ($uc.name|first_notnull:"") ~ " | " ~ ($uc.issuer|first_notnull:"") ~ " | " ~ ($uc.issued_date|first_notnull:"") ~ " | " ~ ($uc.url|first_notnull:"") ~ "\n"
        }
      }
    }

    var $cert_block {
      value = ""
    }

    conditional {
      if (($user_certs|count) > 0) {
        var.update $cert_block {
          value = "\nCERTIFICATIONS (candidate-provided, use exactly these):\n" ~ $cert_text
        }
      }
    }

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
          
            // Per-profile opt-out: skip job-description-driven title tailoring entirely
            // and always use the candidate's real profile job title. Default is enabled (true).
            var $tailor_job_title_flag {
              value = ($prof.tailor_job_title|json_encode) != "false"
            }
          
            conditional {
              if ($tech_scope_mapped && $tailor_job_title_flag) {
                var.update $last_position_title_for_prompt {
                  value = ($seniority_prefix ~ " " ~ $tech_scope_full)|trim
                }
              }
            }
          
            // Resume section / item visibility and bullet counts (profile.resume_sections, legacy include_* folded in)
            function.run "resume/resolve_section_preferences" {
              input = {profile: $prof}
            } as $section_prefs

            // Total experience span: earliest start_date -> latest end (today for current / open-ended rows).
            // Month arithmetic on the "YYYY-MM-DD" date text; $exp_months stays -1 when unknown.
            var $exp_today {
              value = now|format_timestamp:"Y-m-d":"UTC"
            }

            var $exp_today_year {
              value = $exp_today|substr:0:4|to_int
            }

            var $exp_today_month {
              value = $exp_today|substr:5:2|to_int
            }

            var $exp_today_months {
              value = ($exp_today_year * 12) + $exp_today_month
            }

            var $exp_min_start {
              value = 0
            }

            var $exp_max_end {
              value = 0
            }

            foreach ($work) {
              each as $ew {
                var $ew_start {
                  value = $ew|get:"start_date":null|first_notnull:""|to_text|trim
                }

                var $ew_end {
                  value = $ew|get:"end_date":null|first_notnull:""|to_text|trim
                }

                var $ew_has_start {
                  value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$ew_start
                }

                var $ew_has_end {
                  value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$ew_end
                }

                conditional {
                  if ($ew_has_start) {
                    var $ew_start_year {
                      value = $ew_start|substr:0:4|to_int
                    }

                    var $ew_start_month {
                      value = $ew_start|substr:5:2|to_int
                    }

                    var $ew_start_m {
                      value = ($ew_start_year * 12) + $ew_start_month
                    }

                    conditional {
                      if ($exp_min_start == 0 || $ew_start_m < $exp_min_start) {
                        var.update $exp_min_start {
                          value = $ew_start_m
                        }
                      }
                    }
                  }
                }

                var $ew_end_m {
                  value = $exp_today_months
                }

                conditional {
                  if (($ew|get:"is_current":false) != true && $ew_has_end) {
                    var $ew_end_year {
                      value = $ew_end|substr:0:4|to_int
                    }

                    var $ew_end_month {
                      value = $ew_end|substr:5:2|to_int
                    }

                    var.update $ew_end_m {
                      value = ($ew_end_year * 12) + $ew_end_month
                    }
                  }
                }

                conditional {
                  if ($ew_end_m > $exp_max_end) {
                    var.update $exp_max_end {
                      value = $ew_end_m
                    }
                  }
                }
              }
            }

            var $exp_months {
              value = -1
            }

            conditional {
              if ($exp_min_start > 0 && $exp_max_end >= $exp_min_start) {
                var.update $exp_months {
                  value = $exp_max_end - $exp_min_start
                }
              }
            }

            var $total_experience_years {
              value = ($exp_months|to_decimal) / 12
            }

            // Internships are only included for candidates with 5 years of experience or less (unknown = include)
            var $include_internships {
              value = $exp_months <= 60
            }

            // Rows sent to the AI (internships dropped when excluded); the FULL $work list is still
            // passed to resume/apply_section_preferences.
            var $work_for_prompt {
              value = []
            }

            foreach ($work) {
              each as $wf {
                var $wf_title {
                  value = $wf|get:"job_title":null|first_notnull:""|to_text
                }

                var $wf_type {
                  value = $wf|get:"employment_type":null|first_notnull:""|to_text
                }

                var $wf_title_intern {
                  value = "/\\bintern(ship)?\\b/i"|regex_matches:$wf_title
                }

                var $wf_type_intern {
                  value = "/\\bintern(ship)?\\b/i"|regex_matches:$wf_type
                }

                conditional {
                  if ($include_internships || (!$wf_title_intern && !$wf_type_intern)) {
                    array.push $work_for_prompt {
                      value = $wf
                    }
                  }
                }
              }
            }

            // Build work experience text
            // The most recent EMITTED entry (first of $work_for_prompt) uses $last_position_title_for_prompt as the job title
            var $work_text {
              value = ""
            }
          
            var $work_idx {
              value = 0
            }
          
            foreach ($work_for_prompt) {
              each as $w {
                // Dates go to the AI as "Mon YYYY" (never raw ISO with a day)
                function.run "resume/format_month_year" {
                  input = {value: ($w.end_date|to_text|first_notnull:"")}
                } as $work_end_fmt

                function.run "resume/format_month_year" {
                  input = {value: ($w.start_date|to_text|first_notnull:"")}
                } as $work_start_fmt

                var $end_label {
                  value = $work_end_fmt|first_notnull:""
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
                  value = $work_text ~ ($title_display|first_notnull:"") ~ " | " ~ ($w.company_name|first_notnull:"") ~ " | " ~ ($location_display|first_notnull:"") ~ " | " ~ ($work_start_fmt|first_notnull:"") ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
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
                function.run "resume/format_month_year" {
                  input = {value: ($e.end_date|to_text|first_notnull:"")}
                } as $edu_date_fmt

                var $edu_line {
                  value = ($e.degree_title|first_notnull:"") ~ " in " ~ ($e.field_of_study|first_notnull:"") ~ " from " ~ ($e.university_name|first_notnull:"")
                }

                var.update $edu_line {
                  value = $edu_line ~ " (" ~ ($edu_date_fmt|first_notnull:"") ~ ")"
                }

                var $edu_row_location {
                  value = $e.location|first_notnull:""|trim
                }

                var $prof_location_text {
                  value = $prof.location|first_notnull:""|trim
                }

                // Education location only when both the row and the profile have one (never guessed)
                conditional {
                  if ($edu_row_location != "" && $prof_location_text != "") {
                    var.update $edu_line {
                      value = $edu_line ~ " | Location: " ~ $edu_row_location
                    }
                  }
                }

                var.update $edu_text {
                  value = $edu_text ~ $edu_line ~ "\n"
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
You write a tailored resume, as one JSON object, from the candidate profile and job description in the user message. Return only that JSON object: no markdown, no commentary, no text before or after it.

SECTIONS
Use the sections and exact key names of the JSON structure in the user message (including leadership_enterpreneurial_experience). Leave a section out only when the user message says to.

TAILORING
Tailor the whole resume to the job description, using only the candidate's real experience.
- technical_skills lists the job description's tools, languages, platforms and methods that the candidate has actually used, broad enough to cover what a recruiter or ATS scan for this role looks for.
- Bullets, projects and leadership entries favor work relevant to the job. The current or most relevant position covers most of the job's listed responsibilities, restated in the candidate's own words.
- Reflect the required qualifications wherever the candidate's experience supports them; preferred ones are optional.
- __TITLE_TAILORING_RULE__
- Never invent skills, experience, titles, honors, coursework or metrics the profile does not support.
- Paraphrase the job description instead of copying its wording (tool and technology names are exempt). Never use the words "leverage", "harden" or "hardening", or the phrase "own it end to end", anywhere in the output, including the cover letter.

COMPANY CONTEXT
For a company you recognize, ground its bullets, projects and leadership entries in what that company actually does (a healthcare booking company: patients, providers, appointments, insurance; a bank: accounts, compliance; a retailer: commerce, inventory, customers), so the work could not describe just any company. Technologies stay accurate to what the candidate used. For a company you don't recognize, don't guess an industry.

WORK EXPERIENCE (career_breakdowns)
Each WORK EXPERIENCE line in the profile is "title | company | location | date range | promotion note".
- Merge roles at the same company into one entry: the title of the most recent role there, and a date range from the first start to the final end. __INTERNSHIP_RULE__
- location is copied exactly from the line, even when it is empty or misspelled.
- date_range is "Mon YYYY - Mon YYYY" (e.g. "Aug 2015 - Apr 2017"), or "Mon YYYY - Present" only when the profile line says Present.
- Bullet counts: the current or most recent position has exactly __BULLETS_CURRENT__ bullets (unless it is an internship), every other non-internship position exactly __BULLETS_FORMER__, and every internship exactly __BULLETS_INTERNSHIP__. These counts override the length of the example arrays.

BULLETS
Each bullet is [specific action verb] + [the process, tool or method used] + [a concrete result], e.g. "Developed tracking systems for the Green District project, cutting staff allocation time by 30% and expenses by $125,000."
- Every bullet, internships included, has a specific metric (money, time, percentage, or volume such as users, requests or records) that is plausible for the role, company size and seniority. Vary the metric type across bullets. No absolute claims such as "zero data loss", "100% uptime", "no incidents" or "no downtime".
- Every bullet names at least one programming language, framework, cloud service, database or platform, describes engineering work, and uses the job description's keywords where the experience supports them.
- Within a position, don't repeat an opening verb or a sentence template. Avoid weak openers ("helped", "worked on", "was responsible for") and the same generic verb on every bullet.
- Match verbs to seniority: Intern or Junior roles don't "led", "architected", "owned", "directed" or "managed"; Senior, Lead or Staff roles don't "assisted" or "helped".
- Each accomplishment appears once in the whole resume, with one consistent set of numbers.

EDUCATION
Most recent first. highlights holds honors or activities from the profile and Relevant holds coursework relevant to the target role; neither is invented.

CERTIFICATIONS
1 to 3 entries, each with name and issuer only (no date, year or url). Use certifications the job description names, or well-known real certifications for its technologies or domain (e.g. AWS Certified Solutions Architect, Google Professional Data Engineer, CompTIA Security+), from real issuers and plausible for the candidate's seniority and timeline.

PORTFOLIO PROJECTS (at most 4) AND LEADERSHIP / ENTREPRENEURIAL EXPERIENCE (at most 3)
Each entry extends real work the candidate did at one of their employers, fits that employer's business and period, and has no date, year or company field. It must not repeat a career_breakdowns accomplishment, reuse a number from that company's bullets, or open with a verb already used to open one of them.
- A project is one core idea (e.g. letting doctors search patient records in plain language). name is "[Project name] ([technologies])"; description follows the bullet formula.
- A leadership entry opens with a specific action verb and stresses responsibilities and measurable results consistent with the rest of the resume. Its role label never claims more seniority than the candidate's real title at that company: for an individual-contributor title, describe the initiative rather than a "Lead" or "Senior" role.

FORMATTING
No bold (** markers) and no em dashes anywhere. Today's year is 2026.
"""
            }
          
            // Per-profile opt-out: substitute the title-tailoring rule text based on
            // $prof.tailor_job_title (default true). When disabled, the header title and
            // career_breakdowns titles MUST stay exactly as written in the candidate profile.
            var $title_tailoring_rule_text {
              value = "The header title and the current (and, where the underlying work genuinely supports it, former) position title(s) in career_breakdowns MAY be reworded to align with the terminology of the target role/job description (e.g. \"Software Engineer\" -> \"Backend Software Engineer\" for a backend-focused JD), but MUST NOT claim a higher seniority level (e.g. Junior -> Senior) or a title/role the candidate did not actually hold."
            }
          
            var $title_tailoring_validation_text {
              value = "Header title and current position title reflect the target role's terminology without inflating seniority."
            }
          
            conditional {
              if (!$tailor_job_title_flag) {
                var.update $title_tailoring_rule_text {
                  value = "The header title and EVERY position title in career_breakdowns MUST be used EXACTLY as written in the candidate profile; do NOT reword, retitle, or align them to the job description's terminology in any way, even if the wording differs from the target role."
                }
              
                var.update $title_tailoring_validation_text {
                  value = "Header title and every career_breakdowns position title match the candidate profile exactly, with no rewording toward the job description's terminology."
                }
              }
            }
          
            // Per-profile bullet counts and internship inclusion (from $section_prefs / $include_internships)
            var $bullets_current_text {
              value = $section_prefs|get:"bullets_current":5|to_text
            }

            var $bullets_former_text {
              value = $section_prefs|get:"bullets_former":3|to_text
            }

            var $bullets_internship_text {
              value = $section_prefs|get:"bullets_internship":2|to_text
            }

            var $internship_rule_text {
              value = "Do NOT include any internship positions."
            }

            conditional {
              if ($include_internships) {
                var.update $internship_rule_text {
                  value = "Internship positions listed in the candidate profile MUST be kept as their own career_breakdowns entries."
                }
              }
            }

            var.update $resume_system_prompt {
              value = $resume_system_prompt
                |replace:"__TITLE_TAILORING_RULE__":$title_tailoring_rule_text
                |replace:"__BULLETS_CURRENT__":$bullets_current_text
                |replace:"__BULLETS_FORMER__":$bullets_former_text
                |replace:"__BULLETS_INTERNSHIP__":$bullets_internship_text
                |replace:"__INTERNSHIP_RULE__":$internship_rule_text
                |replace:"__TITLE_TAILORING_VALIDATION__":$title_tailoring_validation_text
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
- Do NOT reuse distinctive job description verbs/phrases such as "leverage"/"high leverage", "harden"/"hardening", "own it end to end", or similarly specific wording; paraphrase with different vocabulary.
"""
            }
          
            var $system_prompt {
              value = $input.skip_cover_letter == true ? $resume_system_prompt : $resume_system_prompt ~ "\n\n" ~ $cover_letter_system_prompt
            }


            conditional {
              if (($user_certs|count) > 0) {
                var.update $system_prompt {
                  value = $system_prompt ~ "\n\n========================================================\nCANDIDATE CERTIFICATIONS OVERRIDE\n========================================================\n\nThe candidate has provided their own certifications (CERTIFICATIONS in the candidate profile). This OVERRIDES the CERTIFICATIONS RULE above: the certifications section MUST contain exactly the candidate-provided certifications, in the same order, with their name and issuer exactly as entered. The server overwrites the certifications section (name, issuer, date as Mon YYYY or YYYY, url) from the candidate's records after you respond, so you may list them with name and issuer only. Do NOT add, invent, or replace them with other certifications, and never include a day in any date."
                }
              }
            }
          
            // Resume JSON schema example, hardcoded directly as a string (no Xano object construction).
            var $resume_schema {
              value = "{\"header\":{\"name\":\"[NAME IN CAPS]\",\"location\":\"[City, State]\",\"email\":\"[Gmail]\",\"phone\":\"[Phone #]\",\"linkedin\":{\"display\":\"in/[username]\",\"url\":\"https://www.linkedin.com/in/[username]\"}},\"career_breakdowns\":[{\"company\":\"[Current Company]\",\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]},{\"company\":\"[Former Company]\",\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]}],\"education\":[{\"institution\":\"[University]\",\"degree\":\"[DEGREE IN CAPS]\",\"location\":\"[City, State]\",\"year\":\"[Mon YYYY]\",\"major\":\"[Major]\",\"highlights\":\"[Accolades, extracurriculars]\",\"Relevant\":\"[Relevant coursework]\"}],\"certifications\":[{\"name\":\"[Cert Name]\",\"issuer\":\"[Issuer]\"}],\"portfolio_projects\":[{\"name\":\"[Project Name] ([Technologies])\",\"description\":\"[Action verb + process + result]\"}],\"leadership_enterpreneurial_experience\":[{\"name\":\"[Initiative Name]\",\"role\":\"[Role]\",\"description\":\"[Responsibilities and results]\"}],\"technical_skills\":{\"programming\":\"xxx, xxx\",\"softwares\":\"xxx, xxx\",\"statistics_and_ml\":\"xxx, xxx\",\"project_management\":\"xxx, xxx\"}}"
            }
          
            // Include/omit optional sections based on profile preferences.
            // Flags come from resume/resolve_section_preferences; they drive the omit instruction
            // and the schema stripping further below.
            // Resume section / item visibility (profile.resume_sections, legacy include_* folded in)
            // $section_prefs is resolved earlier (before the work experience text / prompt substitution)

            var $include_key_projects_flag {
              value = ($section_prefs|get:"portfolio_projects":true) == true
            }

            var $include_certifications_flag {
              value = ($section_prefs|get:"certifications":true) == true
            }

            var $include_leadership_flag {
              value = ($section_prefs|get:"leadership":true) == true
            }

            var $include_technical_skills_flag {
              value = ($section_prefs|get:"technical_skills":true) == true
            }

            var $include_education_flag {
              value = ($section_prefs|get:"education":true) == true
            }

            var $include_work_experience_flag {
              value = ($section_prefs|get:"work_experience":true) == true
            }

            var $include_summary_flag {
              value = ($section_prefs|get:"summary":true) == true
            }

            var $include_headline_flag {
              value = ($section_prefs|get:"headline":true) == true
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

            conditional {
              if (!$include_leadership_flag) {
                array.push $omit_sections_list {
                  value = "leadership_enterpreneurial_experience"
                }
              }
            }

            conditional {
              if (!$include_technical_skills_flag) {
                array.push $omit_sections_list {
                  value = "technical_skills"
                }
              }
            }

            conditional {
              if (!$include_education_flag) {
                array.push $omit_sections_list {
                  value = "education"
                }
              }
            }

            conditional {
              if (!$include_work_experience_flag) {
                array.push $omit_sections_list {
                  value = "career_breakdowns"
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
          
            // Only the sections the admin enabled go into the JSON structure we send (disabled ones are removed
            // from the schema instead of only being mentioned in the omit instruction).
            conditional {
              if (!$include_certifications_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"certifications\":[{\"name\":\"[Cert Name]\",\"issuer\":\"[Issuer]\"}]":""
                }
              }
            }

            conditional {
              if (!$include_key_projects_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"portfolio_projects\":[{\"name\":\"[Project Name] ([Technologies])\",\"description\":\"[Action verb + process + result]\"}]":""
                }
              }
            }

            conditional {
              if (!$include_leadership_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"leadership_enterpreneurial_experience\":[{\"name\":\"[Initiative Name]\",\"role\":\"[Role]\",\"description\":\"[Responsibilities and results]\"}]":""
                }
              }
            }

            conditional {
              if (!$include_technical_skills_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"technical_skills\":{\"programming\":\"xxx, xxx\",\"softwares\":\"xxx, xxx\",\"statistics_and_ml\":\"xxx, xxx\",\"project_management\":\"xxx, xxx\"}":""
                }
              }
            }

            conditional {
              if (!$include_education_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"education\":[{\"institution\":\"[University]\",\"degree\":\"[DEGREE IN CAPS]\",\"location\":\"[City, State]\",\"year\":\"[Mon YYYY]\",\"major\":\"[Major]\",\"highlights\":\"[Accolades, extracurriculars]\",\"Relevant\":\"[Relevant coursework]\"}]":""
                }
              }
            }

            conditional {
              if (!$include_work_experience_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:",\"career_breakdowns\":[{\"company\":\"[Current Company]\",\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]},{\"company\":\"[Former Company]\",\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]}]":""
                }
              }
            }

            // Summary goes right after the header object (inserted before the headline so the anchor still matches)
            conditional {
              if ($include_summary_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:"[username]\"}}":"[username]\"}},\"summary\":\"[2-3 sentence professional summary tailored to the job description]\""
                }
              }
            }

            // Headline: professional title inside the header object
            conditional {
              if ($include_headline_flag) {
                var.update $resume_schema {
                  value = $resume_schema|replace:"https://www.linkedin.com/in/[username]\"}}":"https://www.linkedin.com/in/[username]\"},\"title\":\"[Professional Title]\"}"
                }
              }
            }

            // Section / format rules (spoken languages, date format, education location, summary)
            var $section_rules_text {
              value = "\n\n========================================================\nSECTION AND FORMAT RULES (OVERRIDE)\n========================================================\n\n- technical_skills MUST NOT contain spoken/human languages (e.g. English, Spanish, French). Programming languages belong under programming.\n- Every date anywhere in the resume MUST be 'Mon YYYY' (e.g. Jun 2025) or 'Present'. Never include a day and never use numeric formats like 01-01-2025.\n- Education location MUST be copied from the candidate profile EDUCATION line; if none is given there, leave location empty. Never guess a university's city."
            }

            conditional {
              if ($include_summary_flag) {
                var.update $section_rules_text {
                  value = $section_rules_text ~ "\n- summary: 2-3 sentences, maximum 60 words, no first person (no I, me, my), no em dashes, tailored to the job description using only the candidate's real experience."
                }
              }
            }

            var.update $system_prompt {
              value = $system_prompt ~ $section_rules_text
            }

            // Schema example bullet arrays follow the configured counts (the model copies the example length)
            var $bullet_placeholder {
              value = "\"[Action verb + process + result, metric]\""
            }

            var $bullets_current_n {
              value = $bullets_current_text|to_int
            }

            var $bullets_former_n {
              value = $bullets_former_text|to_int
            }

            var $bullets_current_items {
              value = []
            }

            for ($bullets_current_n) {
              each as $bci {
                var.update $bullets_current_items {
                  value = $bullets_current_items|push:$bullet_placeholder
                }
              }
            }

            var $bullets_former_items {
              value = []
            }

            for ($bullets_former_n) {
              each as $bfi {
                var.update $bullets_former_items {
                  value = $bullets_former_items|push:$bullet_placeholder
                }
              }
            }

            var $bullets_current_joined {
              value = $bullets_current_items|join:","
            }

            var $bullets_former_joined {
              value = $bullets_former_items|join:","
            }

            var $schema_current_bullets_old {
              value = "\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]"
            }

            var $schema_current_bullets_new {
              value = "\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[" ~ $bullets_current_joined ~ "]"
            }

            var $schema_former_bullets_old {
              value = "\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]"
            }

            var $schema_former_bullets_new {
              value = "\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[" ~ $bullets_former_joined ~ "]"
            }

            var.update $resume_schema {
              value = $resume_schema|replace:$schema_current_bullets_old:$schema_current_bullets_new
            }

            var.update $resume_schema {
              value = $resume_schema|replace:$schema_former_bullets_old:$schema_former_bullets_new
            }

            var $result_schema {
              value = $input.skip_cover_letter == true ? "{\n  \"resume\": " ~ $resume_schema ~ "\n}" : "{\n  \"resume\": " ~ $resume_schema ~ ",\n  \"cover_letter\": \"<full tailored cover letter as HTML>\"\n}"
            }

            // Structured-output JSON schema (output_config.format) matching $result_schema above
            var $include_cover_letter_flag {
              value = $input.skip_cover_letter != true
            }

            function.run "resume/output_schema" {
              input = {
                include_cover_letter: $include_cover_letter_flag
                summary             : $include_summary_flag
                headline            : $include_headline_flag
                work_experience     : $include_work_experience_flag
                education           : $include_education_flag
                certifications      : $include_certifications_flag
                portfolio_projects  : $include_key_projects_flag
                leadership          : $include_leadership_flag
                technical_skills    : $include_technical_skills_flag
              }
            } as $output_schema

            var $response_text {
              value = ""
            }
          
            // Future (effort / Claude Sonnet 5.5; tried and rolled back on 2026-11-13):
            // Sonnet 5.5 rejects thinking "disabled", and Haiku 5.5 rejects it above effort "high". To use effort,
            // replace the thinking line with an effort setting that is left out for Haiku 4.5 (it rejects effort):
            //   |set_conditional:"output_config":({}|set:"effort":"max"):($ai_model_id != "claude-haiku-4-5")
            // and raise max_tokens, since thinking counts toward it. At "max" with the current prompt,
            // Haiku 5.5 used all 32000 tokens thinking and returned no resume, so test lower effort first.
            try_catch {
              try {
                api.request {
                  url = "https://api.anthropic.com/v1/messages"
                  method = "POST"
                  params = {}
                    |set:"model":$ai_model_id
                    |set:"thinking":({}|set:"type":"disabled")
                    |set:"max_tokens":6000
                    |set:"output_config":({}|set:"format":({}|set:"type":"json_schema"|set:"schema":$output_schema))
                    |set:"system":([]
                      |push:({}
                        |set:"type":"text"
                        |set:"text":$system_prompt
                        |set:"cache_control":({}|set:"type":"ephemeral"|set:"ttl":"1h")
                      )
                    )
                    |set:"messages":([]
                      |push:({}
                        |set:"role":"user"
                        |set:"content":([]
                          |push:({}
                            |set:"type":"text"
                            |set:"text":"Generate a full tailored resume and cover letter.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ $profile_contact_section ~ " (keep it empty for missing fields )\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ $cert_block ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ $result_schema ~ $omit_instruction
                            |set:"cache_control":({}|set:"type":"ephemeral"|set:"ttl":"1h")
                          )
                          |push:({}
                            |set:"type":"text"
                            |set:"text":"\nJOB DESCRIPTION:\n" ~ ($input.job_description|substr:0:12000) ~ "\n\nReturn only JSON and generate values only defined in the JSON. No explanations. No markdown. No additional text."
                          )
                        )
                      )
                    )
                  headers = []
                    |push:"Content-Type: application/json"
                    |push:$claude_auth
                    |push:"anthropic-version: 2023-06-01"
                  timeout = 300
                } as $ai_resp

                // Capture usage immediately so it is billed even if parsing below throws
                var.update $main_usage {
                  value = $ai_resp.response.result.usage|first_notnull:{}
                }

                // Why the reply ended (end_turn / max_tokens / refusal); used for the error message if parsing fails
                var $ai_result {
                  value = $ai_resp.response.result|first_notnull:{}
                }

                var $stop_reason {
                  value = $ai_result|get:"stop_reason":""
                }

                var.update $response_text {
                  value = ($ai_resp.response.result.content|filter:($$.type == "text"))|first|get:"text"
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
                    // Second attempt: drop a stray ")" between a closing quote and ] } or , (e.g. ...rates.")]})
                    var $paren_fixed_response {
                      value = "/\"[)](?=[ \t\r\n]*[]},])/"|regex_replace:"\"":$clean_response
                    }

                    try_catch {
                      try {
                        var.update $parsed_response {
                          value = $paren_fixed_response|json_decode
                        }
                      }

                      catch {
                        // Third attempt: remove last character (common extra trailing brace issue)
                        var $trimmed_response {
                          value = ("/.$/s"|regex_replace:"":$clean_response)|trim
                        }

                        try_catch {
                          try {
                            var.update $parsed_response {
                              value = $trimmed_response|json_decode
                            }
                          }

                          catch {
                            // Fourth attempt: append the missing final closing brace
                            var $brace_appended_response {
                              value = $clean_response ~ "}"
                            }

                            try_catch {
                              try {
                                var.update $parsed_response {
                                  value = $brace_appended_response|json_decode
                                }
                              }

                              catch {
                                // JSON is truly invalid; $parsed_response stays null, handled below
                                debug.log {
                                  value = "JSON parse failed after all repair attempts (stop_reason: " ~ $stop_reason ~ "): " ~ $error
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }

                // Shape fix: move a cover_letter nested inside resume up to the top level
                conditional {
                  if ($parsed_response != null && ($parsed_response|is_object)) {
                    var $top_cover_letter {
                      value = $parsed_response|get:"cover_letter":null
                    }

                    var $parsed_resume_obj {
                      value = $parsed_response|get:"resume":null
                    }

                    var $nested_cover_letter {
                      value = null
                    }

                    conditional {
                      if ($parsed_resume_obj != null && ($parsed_resume_obj|is_object)) {
                        var.update $nested_cover_letter {
                          value = $parsed_resume_obj|get:"cover_letter":null
                        }
                      }
                    }

                    conditional {
                      if ($top_cover_letter == null && $nested_cover_letter != null) {
                        var $resume_without_cover_letter {
                          value = $parsed_resume_obj|unset:"cover_letter"
                        }

                        var.update $parsed_response {
                          value = $parsed_response|set:"resume":$resume_without_cover_letter|set:"cover_letter":$nested_cover_letter
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

                    conditional {
                      if ($stop_reason == "max_tokens") {
                        var.update $error_msg {
                          value = "AI processing error: the response was cut off (too long). Please try again."
                        }
                      }

                      elseif ($stop_reason == "refusal") {
                        var.update $error_msg {
                          value = "AI processing error: the AI declined this job description. Please try again or use another job."
                        }
                      }
                    }

                    debug.log {
                      value = "Resume JSON parse failed; stop_reason: " ~ $stop_reason
                    }
                  }

                  else {
                    var.update $match_status {
                      value = 1
                    }
                  
                    // Profile is the source of truth for header contact info (AI may omit/garble it)
                    function.run "resume/apply_profile_header" {
                      input = {resume: $parsed_response.resume, profile: $prof}
                    } as $resume_final

                    // ==================== DATE / CERTIFICATION NORMALIZATION ====================
                    // No resume date may include a day. Projects/leadership carry no dates at all.
                    // Manual certifications (certification table) are owned by code: they replace whatever the AI returned.
                    var $month_abbr {
                      value = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                    }

                    var $resume_is_obj {
                      value = $resume_final != null && ($resume_final|is_object)
                    }

                    conditional {
                      if ($resume_is_obj) {
                        // Portfolio projects: strip every date-like key (and company, used by the PDF date fallback)
                        var $src_projects {
                          value = $resume_final|get:"portfolio_projects":null
                        }

                        conditional {
                          if ($src_projects != null && ($src_projects|is_array)) {
                            var $clean_projects {
                              value = []
                            }

                            foreach ($src_projects) {
                              each as $pp {
                                var $pp_clean {
                                  value = $pp
                                }

                                conditional {
                                  if ($pp|is_object) {
                                    var.update $pp_clean {
                                      value = $pp|unset:"date"|unset:"date_range"|unset:"start"|unset:"end"
                                    }

                                    var.update $pp_clean {
                                      value = $pp_clean|unset:"year"|unset:"company"
                                    }
                                  }
                                }

                                array.push $clean_projects {
                                  value = $pp_clean
                                }
                              }
                            }

                            var.update $resume_final {
                              value = $resume_final|set:"portfolio_projects":$clean_projects
                            }
                          }
                        }

                        // Leadership entries: strip every date-like key
                        var $src_leadership {
                          value = $resume_final|get:"leadership_enterpreneurial_experience":null
                        }

                        conditional {
                          if ($src_leadership != null && ($src_leadership|is_array)) {
                            var $clean_leadership {
                              value = []
                            }

                            foreach ($src_leadership) {
                              each as $ld {
                                var $ld_clean {
                                  value = $ld
                                }

                                conditional {
                                  if ($ld|is_object) {
                                    var.update $ld_clean {
                                      value = $ld|unset:"date"|unset:"date_range"|unset:"start"|unset:"end"
                                    }

                                    var.update $ld_clean {
                                      value = $ld_clean|unset:"year"
                                    }
                                  }
                                }

                                array.push $clean_leadership {
                                  value = $ld_clean
                                }
                              }
                            }

                            var.update $resume_final {
                              value = $resume_final|set:"leadership_enterpreneurial_experience":$clean_leadership
                            }
                          }
                        }

                        // Certifications
                        conditional {
                          if (($user_certs|count) > 0 && $include_certifications_flag) {
                            var $manual_certs {
                              value = []
                            }

                            foreach ($user_certs) {
                              each as $mc {
                                var $mc_raw_date {
                                  value = $mc.issued_date|first_notnull:""|to_text|trim
                                }

                                var $mc_date {
                                  value = $mc_raw_date
                                }

                                // "YYYY-MM" or "YYYY-MM-DD..." -> "Mon YYYY"
                                var $m_iso {
                                  value = "/^(\\d{4})-(\\d{1,2})/"|regex_get_first_match:$mc_raw_date
                                }

                                // "Month DD, YYYY" -> "Mon YYYY"
                                var $m_named {
                                  value = "/^([A-Za-z]{3})[A-Za-z]*\\.?\\s+\\d{1,2}(st|nd|rd|th)?,?\\s+(\\d{4})$/"|regex_get_first_match:$mc_raw_date
                                }

                                // "MM/DD/YYYY" -> "Mon YYYY"
                                var $m_slash {
                                  value = "/^(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})$/"|regex_get_first_match:$mc_raw_date
                                }

                                conditional {
                                  if (($m_iso|count) > 2) {
                                    var $iso_month {
                                      value = ($m_iso|get:2)|to_int
                                    }

                                    conditional {
                                      if ($iso_month >= 1 && $iso_month <= 12) {
                                        var.update $mc_date {
                                          value = ($month_abbr|get:($iso_month - 1)) ~ " " ~ ($m_iso|get:1)
                                        }
                                      }

                                      else {
                                        var.update $mc_date {
                                          value = $m_iso|get:1
                                        }
                                      }
                                    }
                                  }

                                  elseif (($m_named|count) > 3) {
                                    var $named_mon {
                                      value = $m_named|get:1|to_lower|capitalize
                                    }

                                    var.update $mc_date {
                                      value = $named_mon ~ " " ~ ($m_named|get:3)
                                    }
                                  }

                                  elseif (($m_slash|count) > 3) {
                                    var $slash_month {
                                      value = ($m_slash|get:1)|to_int
                                    }

                                    conditional {
                                      if ($slash_month >= 1 && $slash_month <= 12) {
                                        var.update $mc_date {
                                          value = ($month_abbr|get:($slash_month - 1)) ~ " " ~ ($m_slash|get:3)
                                        }
                                      }

                                      else {
                                        var.update $mc_date {
                                          value = $m_slash|get:3
                                        }
                                      }
                                    }
                                  }
                                }

                                var $mc_url {
                                  value = $mc.url|first_notnull:""|to_text|trim
                                }

                                conditional {
                                  if ($mc_url != "" && !("/^https?:\\/\\//i"|regex_matches:$mc_url)) {
                                    var.update $mc_url {
                                      value = "https://" ~ $mc_url
                                    }
                                  }
                                }

                                var $mc_name {
                                  value = $mc.name|first_notnull:""|to_text|trim
                                }

                                var $mc_issuer {
                                  value = $mc.issuer|first_notnull:""|to_text|trim
                                }

                                array.push $manual_certs {
                                  value = {}|set:"name":$mc_name|set:"issuer":$mc_issuer|set:"date":$mc_date|set:"url":$mc_url
                                }
                              }
                            }

                            var.update $resume_final {
                              value = $resume_final|set:"certifications":$manual_certs
                            }
                          }

                          elseif (($user_certs|count) == 0) {
                            // AI-proposed certifications: never dated
                            var $src_certs {
                              value = $resume_final|get:"certifications":null
                            }

                            conditional {
                              if ($src_certs != null && ($src_certs|is_array)) {
                                var $clean_certs {
                                  value = []
                                }

                                foreach ($src_certs) {
                                  each as $ac {
                                    var $ac_clean {
                                      value = $ac
                                    }

                                    conditional {
                                      if ($ac|is_object) {
                                        var.update $ac_clean {
                                          value = $ac|unset:"date"|unset:"date_range"|unset:"year"
                                        }
                                      }
                                    }

                                    array.push $clean_certs {
                                      value = $ac_clean
                                    }
                                  }
                                }

                                var.update $resume_final {
                                  value = $resume_final|set:"certifications":$clean_certs
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    // ==================== END DATE / CERTIFICATION NORMALIZATION ====================

                    // Section / item visibility, date normalization, DB-only education location, spoken languages
                    function.run "resume/apply_section_preferences" {
                      input = {resume: $resume_final, profile: $prof, education_records: $education, work_records: $work, prefs: $section_prefs}
                    } as $resume_final


                    var.update $resume_text {
                      value = $resume_final|json_encode
                    }
                  
                    conditional {
                      if ($input.skip_cover_letter != true) {
                        var.update $cover_letter_text {
                          value = $parsed_response.cover_letter
                        }
                      }
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
          }
        }

        // Totals = extraction call + main call, on every path (success, rejected job, AI error).
        var.update $input_tokens {
          value = ($main_usage|get:"input_tokens"|first_notnull:0) + $extraction_input_tokens
        }

        var.update $output_tokens {
          value = ($main_usage|get:"output_tokens"|first_notnull:0) + $extraction_output_tokens
        }

        var.update $cache_creation_input_tokens {
          value = ($main_usage|get:"cache_creation_input_tokens"|first_notnull:0) + $extraction_cache_creation_tokens
        }

        var.update $cache_read_input_tokens {
          value = ($main_usage|get:"cache_read_input_tokens"|first_notnull:0) + $extraction_cache_read_tokens
        }
      
        // Raw provider cost priced PER AI CALL (extraction + generation): the Haiku 5.5 price tier is
        // chosen by each request's own prompt size, so the two calls are never priced on their summed tokens.
        var $ext_cost_input_tokens {
          value = $extraction_input_tokens|first_notnull:0
        }

        var $ext_cost_output_tokens {
          value = $extraction_output_tokens|first_notnull:0
        }

        var $ext_cost_cache_creation_tokens {
          value = $extraction_cache_creation_tokens|first_notnull:0
        }

        var $ext_cost_cache_read_tokens {
          value = $extraction_cache_read_tokens|first_notnull:0
        }

        var $main_cost_input_tokens {
          value = $main_usage|get:"input_tokens"|first_notnull:0
        }

        var $main_cost_output_tokens {
          value = $main_usage|get:"output_tokens"|first_notnull:0
        }

        var $main_cost_cache_creation_tokens {
          value = $main_usage|get:"cache_creation_input_tokens"|first_notnull:0
        }

        var $main_cost_cache_read_tokens {
          value = $main_usage|get:"cache_read_input_tokens"|first_notnull:0
        }

        function.run "ai/claude_haiku_cost" {
          input = {
            model                : $ai_model_id
            input_tokens         : $ext_cost_input_tokens
            output_tokens        : $ext_cost_output_tokens
            cache_creation_tokens: $ext_cost_cache_creation_tokens
            cache_read_tokens    : $ext_cost_cache_read_tokens
          }
        } as $extraction_raw_cost

        function.run "ai/claude_haiku_cost" {
          input = {
            model                : $ai_model_id
            input_tokens         : $main_cost_input_tokens
            output_tokens        : $main_cost_output_tokens
            cache_creation_tokens: $main_cost_cache_creation_tokens
            cache_read_tokens    : $main_cost_cache_read_tokens
          }
        } as $main_raw_cost

        var $raw_cost_usd {
          value = ($extraction_raw_cost + $main_raw_cost)|round:8
        }

        // Usage rate in force right now: saved on the log row and used for the charge (log and ledger agree)
        function.run "credits/get_usage_rate" {
          input = {admin_id: $billing_check.billing_admin_id, model: $ai_model_id}
        } as $log_rate_info

        var $usage_rate {
          value = $log_rate_info.usage_rate
        }

        // Non-billable usage is logged with charged_amount 0; billable rows stay null until the charge patches them
        var $log_charged {
          value = 0
        }

        conditional {
          if ($billing_check.is_billable && !$billing_check.free_trial) {
            var.update $log_charged {
              value = null
            }
          }
        }

        conditional {
          if ($input.force_generate) {
            db.edit generation_log {
              field_name = "id"
              field_value = $input.log_id
              data = {
                input_tokens                : $input_tokens
                output_tokens                : $output_tokens
                cache_creation_input_tokens : $cache_creation_input_tokens
                cache_read_input_tokens      : $cache_read_input_tokens
                usage_rate: $usage_rate
                ai_model: $ai_model_id
                raw_cost_usd: $raw_cost_usd
                charged_amount: $log_charged
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
                cache_creation_input_tokens: $cache_creation_input_tokens
                cache_read_input_tokens     : $cache_read_input_tokens
                usage_rate: $usage_rate
                ai_model: $ai_model_id
                raw_cost_usd: $raw_cost_usd
                charged_amount: $log_charged
                resume_filename      : $resume_filename
                cover_letter_filename: $cover_letter_filename
                position_title       : $position_title
                company_name         : $company_name
                is_regenerated       : 0
                is_matched           : $match_status
                match_reason         : $error_msg
                seniority            : $seniority_txt
                tech_scope           : $tech_scope_txt
                compensation         : $compensation
                content_id           : $resume_content_id
              }
            } as $log
          }
        }
      }
    }

    // Charge the billing admin for this AI usage (1.5x raw provider cost).
    // Skipped for the legacy-proxy path (generate_legacy_POST bills itself) and
    // for non-billable users (super_admin, or bidders with no resolvable admin).
    conditional {
      if (!$use_legacy_api && $billing_check.is_billable) {
        function.run "credits/credit_charge_usage" {
          input = {
            model                : $ai_model_id
            admin_id             : $billing_check.billing_admin_id
            usage_rate           : $usage_rate
            call_raw_cost_usd: $raw_cost_usd
            input_tokens         : $input_tokens
            output_tokens        : $output_tokens
            cache_creation_tokens: $cache_creation_input_tokens
            cache_read_tokens    : $cache_read_input_tokens
            profile_id           : $input.profile_id
            related_log_table    : "generation_log"
            related_log_id       : $log.id
            allow_negative       : true
            free_trial          : $billing_check.free_trial
          }
        } as $gen_charge

        // Free trial: only a successfully produced resume consumes one free generation
        conditional {
          if ($billing_check.free_trial && $match_status == 1) {
            function.run "credits/consume_free_generation" {
              input = {admin_id: $billing_check.billing_admin_id, model: $ai_model_id}
            } as $free_consumed

            var.update $free_trial_info {
              value = {remaining: $free_consumed.remaining, total: $free_allowance}
            }
          }
        }

        // Record the final billed amount on the log row; a failure here must not undo the charge
        try_catch {
          try {
            db.patch generation_log {
              field_name = "id"
              field_value = $log.id
              data = {charged_amount: $gen_charge.charged, billing_admin_id: $billing_check.billing_admin_id}
            } as $_log_patch
          }

          catch {
            debug.log {
              value = "generation_log charged_amount patch failed"
            }
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
    credit_warning       : $credit_warning
    free_trial           : $free_trial_info
  }
  guid = "vDQ6aTeV9eOCjodRS0WCIQ-l4fc"
}