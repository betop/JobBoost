// Regenerate resume only (no cover letter) using stored job description from DB
// OPTIMIZED FOR SPEED: single AI call, max_tokens=5000, optimized substrings
query "resume/regenerate" verb=POST {
  api_group = "resume"
  auth = "admin"

  input {
    uuid log_id
  }

  stack {
    precondition ($input.log_id != null) {
      error_type = "badrequest"
      error = "log_id is required"
    }
  
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $original_log
  
    precondition ($original_log != null) {
      error_type = "notfound"
      error = "Original generation log not found"
    }
  
    precondition ($original_log.job_description != null && $original_log.job_description != "") {
      error_type = "badrequest"
      error = "No job description stored for this log"
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $job_description {
      value = $original_log.job_description
    }
  
    // Load profile
    db.get profile {
      field_name = "id"
      field_value = $original_log.profile_id
    } as $prof
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    // Load education, work experience, rules
    db.query education {
      where = $db.education.profile_id == $prof.id
      sort = {education.start_date: "asc"}
      return = {type: "list"}
    } as $education
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $prof.id
      sort = {work_experience.start_date: "desc"}
      return = {type: "list"}
    } as $work
  
    db.query rule {
      where = $db.rule.is_active == true
      sort = {rule.created_at: "asc"}
      return = {type: "list"}
    } as $rules
  
    // Build work experience text
    var $work_text {
      value = ""
    }
  
    foreach ($work) {
      each as $w {
        var $end_label {
          value = "Present"
        }
      
        conditional {
          if ($w.end_date != null) {
            var.update $end_label {
              value = $w.end_date
            }
          }
        }
      
        var.update $work_text {
          value = $work_text ~ $w.job_title ~ " at " ~ $w.company_name ~ " (" ~ $w.start_date ~ " - " ~ $end_label ~ ") "
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
          value = $edu_text ~ $e.degree_title ~ " in " ~ $e.field_of_study ~ " from " ~ $e.university_name ~ " (" ~ $e.end_date ~ ") "
        }
      }
    }
  
    // Build rules text
    var $rules_text {
      value = ""
    }
  
    foreach ($rules) {
      each as $r {
        var.update $rules_text {
          value = $rules_text ~ $r.sentence ~ " "
        }
      }
    }
  
    // Build prompt — 3 states: skip (not remote), mismatch (domain), match
    var $system_prompt {
      value = "You are an expert resume writer. Evaluate the job description in two steps and return ONLY a single valid JSON object. The resume field must be a structured JSON object following the exact schema provided — NOT an HTMLstring."
    }
  
    var $skip_schema {
      value = {}
        |set:"status":"skip"
        |set:"reason":"Job requires relocation or at least 1 day in office — not 100% remote"
        |set:"resume":""
        |set:"position_title":""
        |set:"company_name":""
    }
  
    var $resume_schema {
      value = {}
        |set:"header":({}
          |set:"name":"FULL NAME CAPS"
          |set:"title":"Most recent or target title"
          |set:"location":"City, State"
          |set:"email":"..."
          |set:"phone":"..."
          |set:"linkedin":({}
            |set:"display":"linkedin.com/in/slug"
            |set:"url":"https://full-url/"
          )
        )
        |set:"summary":"Results-driven [job title] with X+ years..."
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
            |set:"date_range":"Mon YYYY – Mon YYYY"
            |set:"location":"Remote|Onsite|Hybrid"
            |set:"company_summary":"italic company description with **bold** tools inline."
            |set:"highlights":([]
              |push:"bullet **tool** action result."
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
            |set:"context":"Company  |  Year"
            |set:"description":"Narrative **bold** terms."
            |set:"tech":"Tool1, Tool2"
          )
        )
        |set:"awards_recognition":([]
          |push:({}
            |set:"name":"Award: Subtitle"
            |set:"context":"Company  |  Year"
            |set:"description":"One sentence **bold** impact."
          )
        )
    }
  
    var $mismatch_schema {
      value = {}
        |set:"status":"mismatch"
        |set:"reason":"<explain why domain does not align>"
        |set:"resume":$resume_schema
        |set:"cover_letter":"<full tailored cover letter as HTML — required even for mismatch>"
        |set:"position_title":"<title>"
        |set:"company_name":"<company>"
    }
  
    var $match_schema {
      value = {}
        |set:"status":"match"
        |set:"reason":"<explain why candidate is a strong fit>"
        |set:"resume":$resume_schema
        |set:"cover_letter":"<full tailored cover letter as HTML>"
        |set:"position_title":"<title>"
        |set:"company_name":"<company>"
    }
  
    var $consolidated_prompt {
      value = "STEP 1 — REMOTE CHECK:\nIf the job requires relocation, mentions hybrid, onsite, in-office, visiting office, or specifies ANY number of days/weeks/months in office, return status=skip immediately. Do NOT generate a resume.\n\nSTEP 2 — DOMAIN MATCH (only if 100% remote):\nIf the job domain does NOT align with the candidate target category, return status=mismatch AND still generate a full tailored resume as HTML.\nIf the job domain DOES align, return status=match AND generate a full tailored resume as HTML.\n\nRules applied to all resumes: " ~ $rules_text ~ "\n\n=== CANDIDATE PROFILE ===\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\n=== WORK EXPERIENCE ===\n" ~ $work_text ~ "\n\n=== EDUCATION ===\n" ~ $edu_text ~ "\n\n=== JOB DESCRIPTION ===\n" ~ ($job_description|substr:0:2000) ~ "\n\nReturn exactly ONE of these JSON schemas:\nIf skip: " ~ ($skip_schema|json_encode) ~ "\nIf mismatch: " ~ ($mismatch_schema|json_encode) ~ "\nIf match: " ~ ($match_schema|json_encode)
    }
  
    var $user_prompt {
      value = ""
    }
  
    // Output variables
    // is_matched: 1=match, 0=mismatch, 2=skip
    var $is_matched {
      value = 1
    }
  
    var $match_reason {
      value = ""
    }
  
    var $resume_text {
      value = ""
    }
  
    var $cover_letter_text {
      value = ""
    }
  
    var $position_title {
      value = ""
    }
  
    var $input_tokens {
      value = 0
    }
  
    var $output_tokens {
      value = 0
    }
  
    // Single AI call - OPTIMIZED max_tokens
    try_catch {
      try {
        api.request {
          url = "https://api.anthropic.com/v1/messages"
          method = "POST"
          params = {}
            |set:"model":"claude-haiku-4-5"
            |set:"max_tokens":5000
            |set:"messages":([]
              |push:({}
                |set:"role":"user"
                |set:"content":$consolidated_prompt ~ "\n\n" ~ $user_prompt
              )
            )
          headers = []
            |push:"Content-Type: application/json"
            |push:$claude_auth
            |push:"anthropic-version: 2023-06-01"
          timeout = 300
        } as $ai_resp
      
        var $response_text {
          value = $ai_resp.response.result.content|first|get:"text"
        }
      
        var.update $input_tokens {
          value = `($ai_resp.response.result.usage|get:"input_tokens") + 0`
        }
      
        var.update $output_tokens {
          value = `($ai_resp.response.result.usage|get:"output_tokens") + 0`
        }
      
        // Parse response
        var $clean_response {
          value = $response_text
            |replace:"```json\n":""
            |replace:"```\n":""
            |replace:"```":""
        }
      
        var $parsed_response {
          value = $clean_response|json_decode
        }
      
        // Extract fields by status
        conditional {
          if ($parsed_response.status == "skip") {
            var.update $is_matched {
              value = 2
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          }
        }
      
        conditional {
          if ($parsed_response.status == "mismatch") {
            var.update $is_matched {
              value = 0
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          
            var.update $resume_text {
              value = $parsed_response.resume
            }
          
            var.update $cover_letter_text {
              value = $parsed_response.cover_letter
            }
          
            var.update $position_title {
              value = $parsed_response.position_title
            }
          }
        }
      
        conditional {
          if ($parsed_response.status == "match") {
            var.update $is_matched {
              value = 1
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          
            var.update $resume_text {
              value = $parsed_response.resume
            }
          
            var.update $cover_letter_text {
              value = $parsed_response.cover_letter
            }
          
            var.update $position_title {
              value = $parsed_response.position_title
            }
          }
        }
      }
    
      catch {
        debug.log {
          value = "Regenerate AI call failed; treating as mismatch"
        }
      
        var.update $is_matched {
          value = 0
        }
      
        var.update $match_reason {
          value = "AI processing error"
        }
      }
    }
  
    var $resume_filename {
      value = $prof.full_name ~ ".pdf"
    }
  
    // Determine original_log_id for regeneration chain
    var $original_log_id {
      value = $original_log.original_log_id
    }
  
    conditional {
      if ($original_log.original_log_id == null) {
        var.update $original_log_id {
          value = $original_log.id
        }
      }
    }
  
    db.add generation_log {
      data = {
        profile_id             : $original_log.profile_id
        bidder_id              : $original_log.bidder_id
        job_url                : $original_log.job_url
        job_description_snippet: $original_log.job_description_snippet
        job_description        : $original_log.job_description
        ai_provider            : "claude"
        input_tokens           : $input_tokens
        output_tokens          : $output_tokens
        resume_filename        : $resume_filename
        cover_letter_filename  : ""
        position_title         : $position_title
        company_name           : $original_log.company_name
        is_regenerated         : 1
        original_log_id        : $original_log_id
        is_matched             : $is_matched
        match_reason           : $match_reason
      }
    } as $log
  }

  response = {
    is_matched       : $is_matched
    match_reason     : $match_reason
    resume_text      : $resume_text
    cover_letter_text: $cover_letter_text
    resume_filename  : $resume_filename
  }
}