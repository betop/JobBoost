// Regenerate resume and cover letter using the stored job description from an existing log
// Mirrors the main generate flow, but remains admin-only.
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
  
    // Verify the authenticated user is an admin
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    precondition ($auth_user != null && ($auth_user.type == "admin" || $auth_user.type == "super_admin")) {
      error_type = "accessdenied"
      error = "Only admin users can regenerate resumes"
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
  
    // Regeneration is admin-only; use a reserved user id for admin-triggered logs
    var $admin_user_id {
      value = "00000000-0000-0000-0000-000000000000"
    }
  
    db.get profile {
      field_name = "id"
      field_value = $original_log.profile_id
    } as $prof
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
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
          value = $w.end_date
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
          if (`$paren_parts.length` > 1) {
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
          value = $work_text ~ $title_display ~ " | " ~ $w.company_name ~ " | " ~ $location_display ~ " | " ~ $w.start_date ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
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
  
    // Build system prompt from active rules in DB
    var $system_prompt {
      value = ""
    }
  
    foreach ($rules) {
      each as $r {
        var.update $system_prompt {
          value = $system_prompt ~ $r.sentence ~ " "
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
  
    // Skip schema - no resume/cover_letter needed, just status and reason
    var $skip_schema {
      value = {}
        |set:"status":"skip"
        |set:"reason":"<reason>"
        |set:"position_title":"<title if identifiable>"
        |set:"company_name":"<company if identifiable>"
    }
  
    // Not JD schema - no resume/cover_letter needed
    var $not_jd_schema {
      value = {}
        |set:"status":"not_job_description"
        |set:"reason":"<explain why this is not a job description>"
    }
  
    var $match_schema {
      value = {}
        |set:"status":"match"
        |set:"reason":"Just keep empty"
        |set:"resume":$resume_schema
        |set:"cover_letter":"<full tailored cover letter as HTML>"
        |set:"position_title":"<title>"
        |set:"company_name":"<company>"
    }
  
    // Mismatch schema - no resume/cover_letter needed, just status and reason
    var $mismatch_schema {
      value = {}
        |set:"status":"mismatch"
        |set:"reason":"<explain why domain does not align>"
        |set:"position_title":"<title>"
        |set:"company_name":"<company>"
    }
  
    // Build user prompt with candidate profile and job description
    var $user_prompt {
      value = "STEP 0 - CONTENT VALIDATION:\n\nFirst, check if the provided text is actually a job description/job posting. If the text is NOT a real job description (e.g. it is a homepage, article, blog post, news, random website content, navigation menu, error page, login page, search results listing, or any other non-job-posting content), return status=not_job_description immediately. Do NOT proceed to other steps.\n\nSTEP 1 - REMOTE CHECK:\n\nIf job description doesn't provide 100% remote position and only requires either relocation, hybrid, onsite, in-office, or at least 1 day office visit, return status=skip. And if job requires Security Clearance or Public trust, return status=skip. Do NOT generate resume or cover letter.\n\nSTEP 2 - DOMAIN MATCH:\n\nIf fully remote:\nIf domain aligns with candidate target category: return status=match and generate full tailored resume and cover letter.\nOtherwise: return status=mismatch with reason only (NO resume or cover letter). If job description requires Staff level Engineer or higher level Engineer than current role in the profile, return status=mismatch.\n\nIMPORTANT: ONLY status=match generates resume and cover letter. All other statuses return status and reason only.\n\n------------------------------------------------------------\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($original_log.job_description|substr:0:2000) ~ "\n\n------------------------------------------------------------\n\nReturn EXACTLY one of these JSON structures:\n\nNOT_JOB_DESCRIPTION: " ~ ($not_jd_schema|json_encode) ~ "\n\nSKIP: " ~ ($skip_schema|json_encode) ~ "\n\nMATCH: " ~ ($match_schema|json_encode) ~ "\n\nMISMATCH: " ~ ($mismatch_schema|json_encode) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
    }
  
    conditional {
      if ($input.force_generate) {
        var.update $user_prompt {
          value = "IMPORTANT: SKIP all validation steps. Do NOT return not_job_description or skip status. Always generate a full tailored resume and cover letter. Treat this as status=match regardless of remote policy or domain alignment.\n\n------------------------------------------------------------\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($original_log.job_description|substr:0:2000) ~ "\n\n------------------------------------------------------------\n\nReturn EXACTLY this JSON structure (status MUST be match):\n\nMATCH: " ~ ($match_schema|json_encode) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
        }
      }
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $is_admin {
      value = true
    }
  
    // is_matched: 1=match, 0=mismatch, 2=skip, 3=not_job_description
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
  
    var $company_name {
      value = ""
    }
  
    var $input_tokens {
      value = 0
    }
  
    var $output_tokens {
      value = 0
    }
  
    var $response_text {
      value = ""
    }
  
    // Initialize content_record as null - will be set when AI call is made
    var $content_record {
      value = null
    }
  
    var $resume_filename {
      value = $prof.full_name ~ ".pdf"
    }
  
    var $cover_letter_filename {
      value = "Cover Letter.pdf"
    }
  
    var $job_description_snippet {
      value = $original_log.job_description|substr:0:300
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
  
    var $log {
      value = null
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
                |set:"content":$user_prompt
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
      
        var.update $input_tokens {
          value = `($ai_resp.response.result.usage|get:"input_tokens") + 0`
        }
      
        var.update $output_tokens {
          value = `($ai_resp.response.result.usage|get:"output_tokens") + 0`
        }
      
        db.add generation_log {
          data = {
            profile_id             : $original_log.profile_id
            user_id                : $admin_user_id
            job_url                : $original_log.job_url
            job_description_snippet: $job_description_snippet
            job_description        : $original_log.job_description
            ai_provider            : "claude"
            input_tokens           : $input_tokens
            output_tokens          : $output_tokens
            resume_filename        : $resume_filename
            cover_letter_filename  : $cover_letter_filename
            position_title         : ""
            company_name           : ""
            is_regenerated         : 1
            original_log_id        : $original_log_id
            is_matched             : 6
            match_reason           : "AI response received, pending processing"
            content_id             : $content_record.id
          }
        } as $pre_decode_log
      
        var.update $log {
          value = $pre_decode_log
        }
      
        var $clean_response {
          value = $response_text
            |replace:"```json\n":""
            |replace:"```JSON\n":""
            |replace:"```\n":""
            |replace:"```":""
            |trim
        }
      
        var $parsed_response {
          value = null
        }
      
        try_catch {
          try {
            var.update $parsed_response {
              value = $clean_response|json_decode
            }
          }
        
          catch {
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
                debug.log {
                  value = "JSON parse failed after second attempt: " ~ $error
                }
              }
            }
          }
        }
      
        conditional {
          if ($parsed_response == null) {
            var.update $is_matched {
              value = 6
            }
          
            var.update $match_reason {
              value = "AI processing error: invalid JSON response. Please try again."
            }
          }
        }
      
        conditional {
          if ($parsed_response != null && $parsed_response.status == "not_job_description") {
            var.update $is_matched {
              value = 3
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          }
        }
      
        conditional {
          if ($parsed_response != null && $parsed_response.status == "skip") {
            var.update $is_matched {
              value = 2
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          
            // Capture position/company if available from skip response
            conditional {
              if ($parsed_response.position_title != null) {
                var.update $position_title {
                  value = $parsed_response.position_title
                }
              }
            }
          
            conditional {
              if ($parsed_response.company_name != null) {
                var.update $company_name {
                  value = $parsed_response.company_name
                }
              }
            }
          }
        }
      
        conditional {
          if ($parsed_response != null && $parsed_response.status == "mismatch") {
            var.update $is_matched {
              value = 0
            }
          
            var.update $match_reason {
              value = $parsed_response.reason
            }
          
            // No resume/cover_letter for mismatch - just capture position/company
            var.update $position_title {
              value = $parsed_response.position_title
            }
          
            var.update $company_name {
              value = $parsed_response.company_name
            }
          }
        }
      
        conditional {
          if ($parsed_response != null && $parsed_response.status == "match") {
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
          
            var.update $company_name {
              value = $parsed_response.company_name
            }
          }
        }
      }
    
      catch {
        debug.log {
          value = "AI call failed: " ~ $error
        }
      
        var.update $is_matched {
          value = 6
        }
      
        var.update $match_reason {
          value = "AI processing error: " ~ $error ~ ". Please try again."
        }
      }
    }
  
    conditional {
      if ($log == null) {
        db.add generation_log {
          data = {
            profile_id             : $original_log.profile_id
            user_id                : $admin_user_id
            job_url                : $original_log.job_url
            job_description_snippet: $job_description_snippet
            job_description        : $original_log.job_description
            ai_provider            : "claude"
            input_tokens           : $input_tokens
            output_tokens          : $output_tokens
            resume_filename        : $resume_filename
            cover_letter_filename  : $cover_letter_filename
            position_title         : $position_title
            company_name           : $company_name
            is_regenerated         : 1
            original_log_id        : $original_log_id
            is_matched             : $is_matched
            match_reason           : $match_reason
            content_id             : $content_record.id
          }
        } as $final_log
      
        var.update $log {
          value = $final_log
        }
      }
    
      else {
        db.edit generation_log {
          field_name = "id"
          field_value = $log.id
          data = {
            input_tokens         : $input_tokens
            output_tokens        : $output_tokens
            resume_filename      : $resume_filename
            cover_letter_filename: $cover_letter_filename
            position_title       : $position_title
            company_name         : $company_name
            is_matched           : $is_matched
            match_reason         : $match_reason
            updated_at           : now
          }
        } as $updated_log
      
        var.update $log {
          value = $updated_log
        }
      }
    }
  }

  response = {
    log_id               : $log.id
    is_matched           : $is_matched
    match_reason         : $match_reason
    applied_date         : ""
    is_admin             : $is_admin
    duplicate_info       : null
    resume_text          : $resume_text
    cover_letter_text    : $cover_letter_text
    resume_filename      : $resume_filename
    cover_letter_filename: $cover_letter_filename
    user_prompt          : $user_prompt
    skipped              : ($is_matched == 2)
  }
}