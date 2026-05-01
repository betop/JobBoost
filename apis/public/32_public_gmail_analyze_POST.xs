// Analyze Gmail batch prompt using Claude Haiku 4.5 via Anthropic API
query "public/gmail-analyze" verb=POST {
  api_group = "public"

  input {
    text mail_contents?
    text version?
  }

  stack {
    precondition ($input.mail_contents != null && $input.mail_contents != "") {
      error_type = "badrequest"
      error = "mail_contents is required"
    }
  
    precondition ($input.version != null && $input.version != "") {
      error_type = "badrequest"
      error = "version is required"
    }
  
    // Version check: reject outdated extension clients
    db.query extension_version {
      where = $db.extension_version.extension_name == "mail-triage" && $db.extension_version.is_current == true
      return = {type: "single"}
    } as $current_version
  
    precondition ($current_version != null && $current_version.version == $input.version) {
      error_type = "badrequest"
      error = "Extension version outdated. Please update Mail-Triage to the latest version."
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $ai_response {
      value = ""
    }
  
    var $system_prompt {
      value = "Output MUST be a single JSON value and nothing else (no markdown, no code fences, no commentary)."
    }
  
    var $user_prompt {
      value = "Extract JSON {\n\"results\": [\n{\n\"id\": \"mail id\",\n\"is_job_application_form_submition_confirmation\": \"true | false\",\n\"is_interview_schedule_request\": \"true | false\",\n\"is_scheduled_interview_confirmation\": \"true |false\",\n\"is_not_move_forward_notification\": \"true | false\",\n\"is_required_some_questions_before_moving_forward\": \"true | false\",\n\"is_technical_assessment\": \"true | false\",\n\"is_final_job_offer\": \"true | false\",\n\"is_important_survey_to_complete_application_form_submition\": \"true | false\",\n\"is_new_job_postings_promotion\": \"true | false\",\n}\n]\n}\n from the following input.\n\nInput JSON:\n" ~ $input.mail_contents ~ "\n\nJust include the propos which value is true, if all props are false, just return empty object with only id prop."
    }
  
    try_catch {
      try {
        api.request {
          url = "https://api.anthropic.com/v1/messages"
          method = "POST"
          params = {}
            |set:"model":"claude-haiku-4-5"
            |set:"max_tokens":15000
            |set:"temperature":0
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
          timeout = 120
        } as $resp
      
        var.update $ai_response {
          value = $resp.response.result.content|first|get:"text"
        }
      }
    
      catch {
        var.update $ai_response {
          value = ""
        }
      }
    }
  
    precondition ($ai_response != null && $ai_response != "") {
      error = "Claude returned empty response"
    }
  
    var $clean_response {
      value = $ai_response
        |replace:"```json\n":""
        |replace:"```JSON\n":""
        |replace:"```\n":""
        |replace:"```":""
        |trim
    }
  }

  response = {ai_response: $clean_response}
}