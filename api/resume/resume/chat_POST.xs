// Chat assistant endpoint — proxies OpenAI GPT-4o keeping the API key server-side
// Accepts a question, optional conversation history and up to 2 PDF file contents (base64)
// When log_id is provided, fetches job_description and resume_content from DB for richer context
query "resume/chat" verb=POST {
  api_group = "resume"

  input {
    text token?
    text question?
    text log_id?
    text resume_base64?
    text cover_letter_base64?
    json history?
  }

  stack {
    precondition ($input.token != null) {
      error_type = "accessdenied"
      error = "Missing authorization key"
    }
  
    precondition ($input.question != null && ($input.question|strlen) > 0) {
      error_type = "badrequest"
      error = "question is required"
    }
  
    // Validate token
    db.query access_token {
      where = $db.access_token.token == $input.token && $db.access_token.is_active == true && $db.access_token.expires_at < now && $db.access_token.user_id != null
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid key"
    }
  
    db.get users {
      field_name = "id"
      field_value = $access.user_id
    } as $user
  
    precondition ($user != null && ($user.type == "super_admin" || $user.is_active)) {
      error_type = "accessdenied"
      error = "User not found or inactive"
    }
  
    // Pay-as-you-go credit check — super_admins are exempt; bidders are billed
    // through the billing admin of the profile attached to the supplied log_id
    // Resolve the profile (if any) from the log context so its billing admin is used
    var $billing_profile_id {
      value = null
    }
  
    conditional {
      if ($input.log_id != null && ($input.log_id|strlen) > 0) {
        db.get generation_log {
          field_name = "id"
          field_value = $input.log_id
        } as $billing_log
      
        conditional {
          if ($billing_log != null) {
            var.update $billing_profile_id {
              value = $billing_log.profile_id
            }
          }
        }
      }
    }
  
    function.run "credits/check_sufficient_balance" {
      input = {user_id: $user.id, profile_id: $billing_profile_id}
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
  
    // ── Fetch log context (JD + resume content) if log_id provided ────────────────
    var $context_block {
      value = ""
    }
  
    conditional {
      if ($input.log_id != null && ($input.log_id|strlen) > 0) {
        db.get generation_log {
          field_name = "id"
          field_value = $input.log_id
        } as $log
      
        conditional {
          if ($log != null) {
            var $jd_text {
              value = $log.job_description
            }
          
            var $resume_text {
              value = ""
            }
          
            conditional {
              if ($log.content_id != null) {
                db.get resume_content {
                  field_name = "id"
                  field_value = $log.content_id
                } as $content
              
                conditional {
                  if ($content != null) {
                    var.update $resume_text {
                      value = $content.raw_response
                    }
                  }
                }
              }
            }
          
            var $parts {
              value = ""
            }
          
            conditional {
              if ($jd_text != null && ($jd_text|strlen) > 0) {
                var.update $parts {
                  value = $parts ~ "=== JOB DESCRIPTION ===\n" ~ ($jd_text|substr:0:12000) ~ "\n\n"
                }
              }
            }
          
            conditional {
              if ($resume_text != null && ($resume_text|strlen) > 0 && ($input.resume_base64 == null || ($input.resume_base64|strlen) == 0)) {
                var.update $parts {
                  value = $parts ~ "=== RESUME CONTENT ===\n" ~ $resume_text ~ "\n\n"
                }
              }
            }
          
            var.update $context_block {
              value = $parts
            }
          }
        }
      }
    }
  
    // ── Build messages array ──────────────────────────────────────────────
    var $system_content {
      value = """
You are a professional writing assistant helping a job applicant answer a free-text question in a job application form, on their behalf (the subject of all answers must be "I").

LENGTH: Application form fields are skimmed, not read closely. Unless the question explicitly asks for a detailed or long-form answer, the answer MUST be 40-80 words, a single short paragraph, and MUST NOT exceed 4 sentences total. Do NOT write a long, essay-style, multi-paragraph answer. Before finalizing your answer, count the words and sentences; if it's over 80 words or more than 4 sentences, cut it down — drop whole sentences/examples entirely rather than trimming words from each one.

TONE: Write like a real guy quickly filling out a form, not composing an essay — direct, plain, no fluff, no corporate buzzwords ("proven track record", "leverage", "passionate about"), no flowery or inflated language. Short, punchy sentences. Get to the point in the first sentence, then stop — don't pad with a wrap-up/summary sentence at the end.

ACCURACY: Only state facts — company names, job titles, degree names and majors, certification names, technologies, dates, and metrics — that are explicitly present in the provided resume/job-description context or uploaded documents. Do NOT invent, guess, or substitute a specific name (e.g. a certification title, a degree major, a company name) that is not present in the context. If a relevant detail is not in the provided information, describe it generally instead of naming something specific (e.g. say "relevant certifications" rather than naming one that is not in the context). If an uploaded resume/cover-letter file is provided, treat it as the single most up-to-date and authoritative source of the candidate's facts — if any text context (e.g. job description or previously stored resume text) conflicts with the uploaded file, trust the uploaded file.

FORMAT: Plain text only — no markdown, no bullet points, no headers, no bold, no em dashes.

No explanations needed, just answer the question based on the provided information. Generate only humanized (American male) answers to the questions.
"""
    }
  
    conditional {
      if (($context_block|strlen) > 0) {
        var.update $system_content {
          value = $system_content ~ "\n\nUse the following context to answer the user's questions:\n\n" ~ $context_block
        }
      }
    }
  
    // var $system_message {
    //   value = {}
    //     |set:"role":"system"
    //     |set:"content":$system_content
    // }
  
    var $messages {
      value = []
    }

    // Attached PDFs go in a stable LEADING turn (before the history) and are marked
    // cacheable, so every follow-up question in the thread reads them from cache at
    // ~10% of the price instead of paying full price for the PDFs on each question.
    var $doc_blocks {
      value = []
    }

    conditional {
      if ($input.resume_base64 != null && ($input.resume_base64|strlen) > 0) {
        var $resume_pdf_data {
          value = "/^data:[^,]*,/"|regex_replace:"":$input.resume_base64
        }

        var $resume_doc_block {
          value = {}
            |set:"type":"document"
            |set:"title":"Candidate resume"
            |set:"source":({}
              |set:"type":"base64"
              |set:"media_type":"application/pdf"
              |set:"data":$resume_pdf_data
            )
        }

        var.update $doc_blocks {
          value = $doc_blocks|push:$resume_doc_block
        }
      }
    }

    conditional {
      if ($input.cover_letter_base64 != null && ($input.cover_letter_base64|strlen) > 0) {
        var $cover_pdf_data {
          value = "/^data:[^,]*,/"|regex_replace:"":$input.cover_letter_base64
        }

        var $cover_doc_block {
          value = {}
            |set:"type":"document"
            |set:"title":"Candidate cover letter"
            |set:"source":({}
              |set:"type":"base64"
              |set:"media_type":"application/pdf"
              |set:"data":$cover_pdf_data
            )
        }

        var.update $doc_blocks {
          value = $doc_blocks|push:$cover_doc_block
        }
      }
    }

    conditional {
      if (($doc_blocks|count) > 0) {
        var $doc_intro_block {
          value = {}
            |set:"type":"text"
            |set:"text":"The documents above are the candidate's current resume and/or cover letter. Treat them as the authoritative source of the candidate's facts."
            |set:"cache_control":({}|set:"type":"ephemeral")
        }

        var $doc_user_msg {
          value = {}
            |set:"role":"user"
            |set:"content":($doc_blocks|push:$doc_intro_block)
        }

        var $doc_ack_msg {
          value = {}
            |set:"role":"assistant"
            |set:"content":"Understood. I will use the attached documents as the source of truth."
        }

        var.update $messages {
          value = $messages|push:$doc_user_msg|push:$doc_ack_msg
        }
      }
    }
  
    // var.update $messages {
    //   value = $messages|push:$system_message
    // }
  
    // Append prior conversation history (each item must have role + content)
    conditional {
      if ($input.history != null && ($input.history|count) > 0) {
        // Keep only the last 8 turns, cap each turn's length, and make sure the
        // thread starts with a user turn. Answers are short, so this loses nothing useful.
        var $hist_count {
          value = $input.history|count
        }

        var $hist_offset {
          value = $hist_count > 8 ? $hist_count - 8 : 0
        }

        var $hist_tail {
          value = $input.history|slice:$hist_offset:8
        }

        var $hist_clean {
          value = []
        }

        foreach ($hist_tail) {
          each as $turn {
            conditional {
              if (($turn.role == "user" || $turn.role == "assistant") && $turn.content != null && !(($hist_clean|count) == 0 && $turn.role == "assistant")) {
                var $turn_clean {
                  value = {}
                    |set:"role":$turn.role
                    |set:"content":($turn.content|substr:0:1200)
                }

                var.update $hist_clean {
                  value = $hist_clean|push:$turn_clean
                }
              }
            }
          }
        }

        // Older extension builds already append the current question to history: drop that copy
        conditional {
          if (($hist_clean|count) > 0) {
            var $hist_last {
              value = $hist_clean|last
            }

            conditional {
              if ($hist_last.role == "user" && $hist_last.content == ($input.question|substr:0:1200)) {
                var.update $hist_clean {
                  value = $hist_clean|slice:0:(($hist_clean|count) - 1)
                }
              }
            }
          }
        }

        foreach ($hist_clean) {
          each as $turn_final {
            var.update $messages {
              value = $messages|push:$turn_final
            }
          }
        }
      }
    }
  
    // Build current user message (text only; PDFs live in the cached leading turn)
    var $user_content {
      value = []
    }
  
    // Append the text question. Marked cacheable so a follow-up question in the
    // same thread (same log_id, same history-so-far as prefix) can read this
    // turn back from cache instead of reprocessing it at full price.
    var $text_block {
      value = {}
        |set:"type":"text"
        |set:"text":$input.question
        |set:"cache_control":({}|set:"type":"ephemeral")
    }
  
    var.update $user_content {
      value = $user_content|push:$text_block
    }
  
    var $user_message {
      value = {}
        |set:"role":"user"
        |set:"content":$user_content
    }
  
    var.update $messages {
      value = $messages|push:$user_message
    }
  
    // ── Call OpenAI ───────────────────────────────────────────────────────
    // var $openai_auth {
    //   value = "Bearer " ~ $env.OPENAI_API_KEY
    // }
  
    // var $openai_body {
    //   value = {}
    //     |set:"model":"gpt-4o-mini"
    //     |set:"max_tokens":1024
    //     |set:"temperature":0.5
    //     |set:"messages":$messages
    // }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
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

    var $reply {
      value = ""
    }
  
    // try_catch {
    //   try {
    //     api.request {
    //       url = "https://api.openai.com/v1/chat/completions"
    //       method = "POST"
    //       params = $openai_body
    //       headers = []
    //         |push:"Content-Type: application/json"
    //         |push:"Authorization: " ~ $openai_auth
    //       timeout = 60
    //     } as $openai_resp
  
    //   var.update $reply {
    //     value = $openai_resp.response.result.choices
    //       |first
    //       |get:"message"
    //       |get:"content"
    //       |trim
    //   }
    // }
  
    // catch {
    //   debug.log {
    //     value = "OpenAI request failed: " ~ $error
    //   }
  
    //     var.update $reply {
    //       value = "Sorry, I couldn't get a response from the AI. Please try again."
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
            |set:"max_tokens":600
            |set:"temperature":0.5
            |set:"system":([]
              |push:({}
                |set:"type":"text"
                |set:"text":$system_content
                |set:"cache_control":({}|set:"type":"ephemeral")
              )
            )
            |set:"messages":$messages
          headers = []
            |push:"Content-Type: application/json"
            |push:$claude_auth
            |push:"anthropic-version: 2023-06-01"
          timeout = 60
        } as $anthropic_resp
      
        var.update $input_tokens {
          value = $anthropic_resp.response.result.usage
            |get:"input_tokens"
            |first_notnull:0
        }
      
        var.update $output_tokens {
          value = $anthropic_resp.response.result.usage
            |get:"output_tokens"
            |first_notnull:0
        }

        var.update $cache_creation_input_tokens {
          value = $anthropic_resp.response.result.usage
            |get:"cache_creation_input_tokens"
            |first_notnull:0
        }

        var.update $cache_read_input_tokens {
          value = $anthropic_resp.response.result.usage
            |get:"cache_read_input_tokens"
            |first_notnull:0
        }

        var.update $reply {
          value = $anthropic_resp.response.result.content
            |first
            |get:"text"
            |trim
        }
      }
    
      catch {
        debug.log {
          value = "AI call failed: " ~ $error
        }
      
        var.update $reply {
          value = "Sorry, I couldn't get a response from the AI. Please try again."
        }
      }
    }
  
    conditional {
      if ($input.log_id != null && ($input.log_id|strlen) > 0) {
        db.add chat_log {
          data = {
            user_id      : $access.user_id
            log_id       : $input.log_id
            question     : $input.question
            answer       : $reply
            input_tokens : $input_tokens
            output_tokens: $output_tokens
            cache_creation_input_tokens: $cache_creation_input_tokens
            cache_read_input_tokens     : $cache_read_input_tokens
          }
        } as $chat_record
      }
    }

    // Charge the billing admin for this AI usage (1.5x raw provider cost)
    conditional {
      if ($billing_check.is_billable) {
        function.run "ai/claude_haiku_cost" {
          input = {
            input_tokens         : $input_tokens
            output_tokens        : $output_tokens
            cache_creation_tokens: $cache_creation_input_tokens
            cache_read_tokens    : $cache_read_input_tokens
          }
        } as $chat_raw_cost

        function.run "credits/credit_charge_usage" {
          input = {
            admin_id        : $billing_check.billing_admin_id
            raw_cost_usd     : $chat_raw_cost
            input_tokens: $input_tokens
            output_tokens: $output_tokens
            cache_creation_tokens: $cache_creation_input_tokens
            cache_read_tokens: $cache_read_input_tokens
            related_log_table: "chat_log"
            allow_negative    : true
          }
        } as $_
      }
    }
  }

  response = {
    answer        : $reply
    credit_warning: $credit_warning
  }
  guid = "mLMGp-AJHgo38XC_T-f39ARfjxs"
}