// Generate resume and cover letter for a job description
// v4: clean rewrite, system prompt from DB rules
query "resume/generate" verb=POST {
  api_group = "resume"

  input {
    uuid profile_id?
    text job_description?
    text token?
    text job_url?
  }

  stack {
    precondition ($input.profile_id != null) {
      error_type = "badrequest"
      error = "profile_id is required"
    }
  
    precondition ($input.job_description != null) {
      error_type = "badrequest"
      error = "job_description is required"
    }
  
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing authorization token"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid token"
    }
  
    precondition ($access.is_active) {
      error_type = "accessdenied"
      error = "Token has been revoked"
    }
  
    db.get bidder {
      field_name = "id"
      field_value = $access.bidder_id
    } as $bid
  
    precondition ($bid != null) {
      error_type = "accessdenied"
      error = "Bidder not found"
    }
  
    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "Bidder account is inactive"
    }
  
    db.get profile {
      field_name = "id"
      field_value = $input.profile_id
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
          value = $work_text ~ $w.job_title ~ " at " ~ $w.company_name ~ " (" ~ $w.start_date ~ " - " ~ $end_label ~ ") " ~ $w.description ~ " "
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
            |set:"location":"Remote|Onsite|Hybrid"
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
  
    var $skip_schema {
      value = {}
        |set:"status":"skip"
        |set:"reason":"<reason>"
        |set:"resume":""
        |set:"cover_letter":""
        |set:"position_title":""
        |set:"company_name":""
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
  
    var $mismatch_schema {
      value = {}
        |set:"status":"mismatch"
        |set:"reason":"<explain why domain does not align>"
        |set:"resume":$resume_schema
        |set:"cover_letter":"<full tailored cover letter as HTML>"
        |set:"position_title":"<title>"
        |set:"company_name":"<company>"
    }
  
    // Build user prompt with candidate profile and job description
    var $user_prompt {
      value = "STEP 1 - REMOTE CHECK:\n\nIf job description mentions relocation, hybrid, onsite, in-office, or required office days, return status=skip. Do NOT generate resume or cover letter.\n\nSTEP 2 - DOMAIN MATCH:\n\nIf fully remote:\nIf domain aligns with candidate target category: return status=match.\nOtherwise: return status=mismatch.\n\nFor match and mismatch: Generate full tailored resume and cover letter.\n\n------------------------------------------------------------\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\nSummary: " ~ $prof.summary ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($input.job_description|substr:0:2000) ~ "\n\n------------------------------------------------------------\n\nReturn EXACTLY one of these JSON structures:\n\nSKIP: " ~ ($skip_schema|json_encode) ~ "\n\nMATCH: " ~ ($match_schema|json_encode) ~ "\n\nMISMATCH: " ~ ($mismatch_schema|json_encode) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
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
      
        var.update $input_tokens {
          value = `($ai_resp.response.result.usage|get:"input_tokens") + 0`
        }
      
        var.update $output_tokens {
          value = `($ai_resp.response.result.usage|get:"output_tokens") + 0`
        }
      
        // Parse JSON response
        var $clean_response {
          value = $response_text
            |replace:"```json\n":""
            |replace:"```\n":""
            |replace:"```":""
        }
      
        var $parsed_response {
          value = $clean_response|json_decode
        }
      
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
          
            var.update $company_name {
              value = $parsed_response.company_name
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
          
            var.update $company_name {
              value = $parsed_response.company_name
            }
          }
        }
      }
    
      catch {
        debug.log {
          value = "AI call failed"
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
  
    var $cover_letter_filename {
      value = "Cover Letter.pdf"
    }
  
    var $job_description_snippet {
      value = $input.job_description|substr:0:300
    }
  
    var $job_url_val {
      value = ""
    }
  
    conditional {
      if ($input.job_url != null) {
        var.update $job_url_val {
          value = $input.job_url
        }
      }
    }
  
    db.add generation_log {
      data = {
        profile_id             : $input.profile_id
        bidder_id              : $access.bidder_id
        job_url                : $job_url_val
        job_description_snippet: $job_description_snippet
        job_description        : $input.job_description
        ai_provider            : "claude"
        input_tokens           : $input_tokens
        output_tokens          : $output_tokens
        resume_filename        : $resume_filename
        cover_letter_filename  : $cover_letter_filename
        position_title         : $position_title
        company_name           : $company_name
        is_regenerated         : 0
        is_matched             : $is_matched
        match_reason           : $match_reason
      }
    } as $log
  }

  response = {
    log_id               : $log.id
    is_matched           : $is_matched
    match_reason         : $match_reason
    resume_text          : $resume_text
    cover_letter_text    : $cover_letter_text
    resume_filename      : $resume_filename
    cover_letter_filename: $cover_letter_filename
  }
}