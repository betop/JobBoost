// Analyze Gmail batch prompt using Claude Haiku 4.5 via Anthropic API
query "public/gmail-analyze" verb=POST {
  api_group = "public"

  input {
    text mail_contents?
    text version?
    text gmail_email?
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
  
    precondition ($input.gmail_email != null && $input.gmail_email != "") {
      error_type = "badrequest"
      error = "gmail_email is required"
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
      value = "You will be given a JSON object with an `emails` array. For each email, decide whether it is job-application related and assign a stage using `subject` + `body`.\n\nReturn ONLY this JSON object schema (no extra keys):\n{\n  \"results\": [\n    {\"id\": string, \"is_job\": boolean, \"stage\": \"application\"|\"failed\"|\"assessment\"|\"interview\"|\"offer\"|\"followup\"|\"survey\"|\"other\"}\n  ]\n}\n\nHard requirements:\n- `results` length MUST equal `emails` length\n- Every `id` in input MUST appear exactly once in `results`\n- Preserve `id` exactly as provided\n- If `is_job` is false, `stage` MUST be \"other\"\n\nGmail label hints (each email has a `labels` array — use these as supporting signals, not overrides):\n- CATEGORY_PROMOTIONS: usually marketing/newsletters. If job-related (job board, career newsletter, hot jobs, job recommendations, company talent acquisition newsletter with 'explore opportunities', 'join our team', 'explore careers'), set is_job=true stage=other. Otherwise is_job=false.\n- CATEGORY_UPDATES: usually transactional/automated. Can be application confirmations (stage=application), rejection notices (stage=failed), OR job platform update emails (stage=other). Always check content.\n- CATEGORY_SOCIAL: rarely job-related. Default is_job=false unless content clearly indicates otherwise.\n- No category label (plain INBOX): treat purely based on content.\n\nIMPORTANT: If the content is about job recommendations, roles matching your profile, resume optimization tips, or platform-driven job discovery (even if labeled CATEGORY_UPDATES), set is_job=true and stage=other.\n\nNOT a job email (is_job MUST be false):\n- Security/verification codes, OTP, 2FA, 'enter this code', 'your code is', 'security code'\n- Password reset or account activation emails\n- Generic marketing, newsletters, promotions unrelated to a specific job\n- Receipts, invoices, shipping notifications\n- Any email whose primary purpose is account/identity verification, even if it mentions the word 'application'\n\nRules for stage (only when is_job=true):\n- application: ONLY a true submission confirmation/receipt from an employer or ATS (e.g., 'we received your application', 'your application has been submitted', 'your application is under review', includes application/req ID or portal confirmation). ATS platforms include workable, greenhouse, lever, taleo, workday, icims, smartrecruiters. IMPORTANT: 'thank you for applying' alone is NOT enough. Verification/code emails are NEVER application.\n- failed: rejection / decline, 'we decided to move forward with another candidate', 'not moving forward', 'we regret to inform you', 'we will not be moving forward with your application', 'we have decided not to move forward', 'unfortunately we are unable to move forward', 'we have chosen to pursue other candidates'\n- assessment: coding test, online assessment, take-home assignment, technical screen task\n- interview: interview scheduling, phone screen, onsite, recruiter call, post-screening/post-interview status update where application was forwarded to hiring manager, requests asking you to share your availability or schedule time (e.g. 'please share your availability', 'let us know your availability', 'can you provide your availability', 'share some times that work for you', 'book a time', 'schedule a call')\n- offer: offer letter, compensation details, you received an offer\n- followup: direct recruiter outreach asking questions before moving forward, NDA to sign before proceeding, self-identification forms, direct invite/introductory emails from recruiters presenting a job opportunity with job description (e.g. 'I came across your profile and think you would be a great fit for...', 'new opportunity that matches your profile', 'let me know if you are interested in this position')\n- survey: survey or questionnaire to complete as part of application process, self-identification form submission requests (including optional links for self-identification such as EEO, disability, veteran status forms)\n- other: job-related but not the above (includes job board alerts, job platform emails, job listing digests, company career newsletters, headhunter match emails, hot jobs newsletters, job opportunity digests from any company or recruiter)\n\nFor \"other\" stage — IMPORTANT: if the email 'from' field contains glassdoor.com, linkedin.com, indeed.com, lensa.com, jobleads.com, ziprecruiter.com, dice.com, connect.dice.com, monster.com, or any job board domain, is_job MUST be true and stage MUST be \"other\". Also set is_job=true and stage=\"other\" when the subject contains keywords like 'hot jobs', 'jobs newsletter', 'job opportunities', 'hiring now', 'now hiring', 'job alert', 'new jobs', 'open positions'.\n\nPrecedence rule:\n- If the email contains rejection language (not moving forward / another candidate / other candidates / unfortunately / regret / position filled), stage MUST be \"failed\" even if it also says 'thank you for applying'.\n\nExamples:\n- 'Your security code is P7WYfA3i. Enter it to resubmit your application.' => is_job=false, stage=other\n- 'Copy and paste this code into the security code field on your application' => is_job=false, stage=other\n- 'Thank you for applying... we have decided to move forward with other candidates' => is_job=true, stage=failed\n- 'Thank you for your application... we are not moving forward at this time' => is_job=true, stage=failed\n- 'After careful consideration, we regret to inform you that we will not be moving forward with your application' => is_job=true, stage=failed\n- 'We received your application for X. We will review and get back to you' => is_job=true, stage=application\n- Email from noreply@glassdoor.com listing job openings => is_job=true, stage=other\n- Email from dice@connect.dice.com about open jobs => is_job=true, stage=other\n- Company career newsletter from talent acquisition team with 'Explore Opportunities', 'Join our team', 'HPE Talent Acquisition Team' => is_job=true, stage=other\n\nIf you are unsure, set `is_job=false` and `stage=\"other\"`.\n\nInput JSON:\n" ~ $input.mail_contents
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
  
    // ── Log this API call ──────────────────────────────────────────────────
    var $input_tokens {
      value = $resp.response.result.usage
        |get:"input_tokens"
        |first_notnull:0
    }
  
    var $output_tokens {
      value = $resp.response.result.usage
        |get:"output_tokens"
        |first_notnull:0
    }
  
    // Count emails in the batch (mail_contents is JSON with "emails" array)
    var $email_count {
      value = 0
    }
  
    try_catch {
      try {
        var $parsed_contents {
          value = $input.mail_contents|json_decode
        }
      
        var $emails_arr {
          value = $parsed_contents|get:"emails"
        }
      
        var.update $email_count {
          value = $emails_arr|count
        }
      }
    
      catch {
        var $noop {
          value = 0
        }
      }
    }
  
    // Validate gmail_email against the allowlist
    db.query mail_triage_allowlist {
      where = $db.mail_triage_allowlist.email == $input.gmail_email
      return = {type: "single"}
    } as $allowlist_entry
  
    precondition ($allowlist_entry != null) {
      error_type = "unauthorized"
      error = "This email is not authorized to use Mail Triage."
    }
  
    db.add mail_triage_log {
      data = {
        gmail_email  : $input.gmail_email|first_notnull:""
        input_tokens : $input_tokens
        output_tokens: $output_tokens
        email_count  : $email_count
      }
    } as $triage_log
  }

  response = {ai_response: $clean_response}
}