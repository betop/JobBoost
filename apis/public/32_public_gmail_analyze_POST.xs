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
      value = "You are a strict JSON generator. Output MUST be a single JSON value and nothing else (no markdown, no code fences, no commentary)."
    }
  
    var $user_prompt {
      value = "You will be given a JSON object with an `emails` array. For each email, decide whether it is job-application related and assign a stage using `subject` + `body`.\n\nReturn ONLY this JSON object schema (no extra keys):\n{\n  \"results\": [\n    {\"id\": string, \"is_job\": boolean, \"stage\": \"application\"|\"failed\"|\"assessment\"|\"interview\"|\"offer\"|\"followup\"|\"survey\"|\"other\"}\n  ]\n}\n\nHard requirements:\n- `results` length MUST equal `emails` length\n- Every `id` in input MUST appear exactly once in `results`\n- Preserve `id` exactly as provided\n- If `is_job` is false, `stage` MUST be \"other\"\n\nNOT a job email (is_job MUST be false):\n- Security/verification codes, OTP, 2FA, 'enter this code', 'your code is', 'security code'\n- Password reset or account activation emails\n- Generic marketing, newsletters, promotions unrelated to a specific job\n- Receipts, invoices, shipping notifications\n- Any email whose primary purpose is account/identity verification, even if it mentions the word 'application'\n\nRules for stage (only when is_job=true):\n- application: ONLY a true submission confirmation/receipt from an employer or ATS (e.g., 'we received your application', 'your application has been submitted', 'your application is under review', includes application/req ID or portal confirmation). ATS platforms include workable, greenhouse, lever, taleo, workday, icims, smartrecruiters. IMPORTANT: 'thank you for applying' alone is NOT enough. Verification/code emails are NEVER application.\n- failed: rejection / decline, 'we decided to move forward with another candidate', 'not moving forward', 'we regret to inform you'\n- assessment: coding test, online assessment, take-home assignment, technical screen task\n- interview: interview scheduling, phone screen, onsite, recruiter call, post-screening/post-interview status update where application was forwarded to hiring manager\n- offer: offer letter, compensation details, you received an offer\n- followup: direct recruiter outreach asking questions before moving forward, NDA to sign before proceeding, self-identification forms\n- survey: survey or questionnaire to complete as part of application process\n- other: job-related but not the above (includes job board alerts, job platform emails, job listing digests, company career newsletters, headhunter match emails)\n\nFor \"other\" stage — IMPORTANT: if the email 'from' field contains glassdoor.com, linkedin.com, indeed.com, lensa.com, jobleads.com, ziprecruiter.com, dice.com, connect.dice.com, monster.com, or any job board domain, is_job MUST be true and stage MUST be \"other\".\n\nPrecedence rule:\n- If the email contains rejection language (not moving forward / another candidate / other candidates / unfortunately / regret / position filled), stage MUST be \"failed\" even if it also says 'thank you for applying'.\n\nExamples:\n- 'Your security code is P7WYfA3i. Enter it to resubmit your application.' => is_job=false, stage=other\n- 'Copy and paste this code into the security code field on your application' => is_job=false, stage=other\n- 'Thank you for applying... we have decided to move forward with other candidates' => is_job=true, stage=failed\n- 'Thank you for your application... we are not moving forward at this time' => is_job=true, stage=failed\n- 'We received your application for X. We will review and get back to you' => is_job=true, stage=application\n- Email from noreply@glassdoor.com listing job openings => is_job=true, stage=other\n- Email from dice@connect.dice.com about open jobs => is_job=true, stage=other\n\nIf you are unsure, set `is_job=false` and `stage=\"other\"`.\n\nInput JSON:\n" ~ $input.mail_contents
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