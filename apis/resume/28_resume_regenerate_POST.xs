// Regenerate resume and cover letter using the stored job description from an existing log
// v2: omit content_id from db.add to avoid empty-string UUID error
query "resume/regenerate" verb=POST {
  api_group = "resume"
  auth = "users"

  input {
    uuid log_id?
    bool force_generate?
  }

  stack {
    precondition ($input.log_id != null) {
      error_type = "badrequest"
      error = "log_id is required"
    }
  
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Generation log not found"
    }
  
    db.get profile {
      field_name = "id"
      field_value = $log.profile_id
    } as $prof
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    precondition ($prof.is_approved) {
      error_type = "accessdenied"
      error = "Profile is not approved. Please contact your admin."
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
  
    var $resume_text {
      value = ""
    }
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $prof.id
      sort = {work_experience.start_date: "desc"}
      return = {type: "list"}
    } as $work
  
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
  
    // Build work experience text
    var $work_text {
      value = ""
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
          
            var.update $title_display {
              value = ($paren_parts|first)|trim
            }
          }
        }
      
        var.update $work_text {
          value = $work_text ~ ($title_display|first_notnull:"") ~ " | " ~ ($w.company_name|first_notnull:"") ~ " | " ~ ($location_display|first_notnull:"") ~ " | " ~ ($w.start_date|to_text|first_notnull:"") ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
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
          |set:"title":"Most recent or target title"
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
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $response_text {
      value = ""
    }
  
    var $match_status {
      value = 0
    }
  
    var $error_msg {
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
                |set:"content":"Generate a full tailored resume only.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($input.job_description) ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ ($resume_schema|json_encode) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
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
              value = $parsed_response|json_encode
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
  
    var.update $input_tokens {
      value = $ai_resp.response.result.usage|get:"input_tokens"
    }
  
    var.update $output_tokens {
      value = $ai_resp.response.result.usage|get:"output_tokens"
    }
  
    db.add generation_log {
      enforce_hidden_fields = false
      data = {
        profile_id           : $log.profile_id
        user_id              : $auth.id
        job_url              : $log.job_url
        job_description      : $log.job_description
        input_tokens         : $input_tokens
        output_tokens        : $output_tokens
        resume_filename      : $resume_filename
        cover_letter_filename: ""
        position_title       : $log.position_title
        company_name         : $log.company_name
        is_regenerated       : 1
        is_matched           : $match_status
        match_reason         : $error_msg
        seniority            : $log.seniority
        tech_scope           : $log.tech_scope
        content_id           : $resume_content_id
      }
    } as $log
  }

  response = {
    match_status   : $match_status
    error_msg      : $error_msg
    resume_text    : $resume_text
    resume_filename: $resume_filename
  }
}