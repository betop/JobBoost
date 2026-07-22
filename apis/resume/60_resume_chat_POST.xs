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
  
    precondition ($user != null && $user.is_active) {
      error_type = "accessdenied"
      error = "User not found or inactive"
    }
  
    // ── Fetch log context (JD + resume content) if log_id provided ────────
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
                  value = $parts ~ "=== JOB DESCRIPTION ===\n" ~ $jd_text ~ "\n\n"
                }
              }
            }
          
            conditional {
              if ($resume_text != null && ($resume_text|strlen) > 0) {
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
        
        LENGTH: Application form fields are skimmed, not read closely. Unless the question explicitly asks for a detailed or long-form answer, the answer MUST be 80-150 words and MUST NOT exceed 6 sentences total, in 1-2 short paragraphs. Do NOT write a long, essay-style, multi-paragraph answer. Before finalizing your answer, count the sentences you wrote; if there are more than 6, cut it down until there are 6 or fewer — remove entire sentences/examples rather than only shortening individual ones.
        
        ACCURACY: Only state facts — company names, job titles, degree names and majors, certification names, technologies, dates, and metrics — that are explicitly present in the provided resume/job-description context or uploaded documents. Do NOT invent, guess, or substitute a specific name (e.g. a certification title, a degree major, a company name) that is not present in the context. If a relevant detail is not in the provided information, describe it generally instead of naming something specific (e.g. say "relevant certifications" rather than naming one that is not in the context). If an uploaded resume/cover-letter file is provided, treat it as the single most up-to-date and authoritative source of the candidate's facts — if any text context (e.g. job description or previously stored resume text) conflicts with the uploaded file, trust the uploaded file.
        
        TONE: Sound like a real person wrote it — natural, specific, and grounded in the real work described in the context, not generic corporate language or an inflated, AI-generated-sounding claim.
        
        FORMAT: Plain text only — no markdown, no bullet points, no headers, no bold, no em dashes.
        
        Keep responses professional yet approachable. No explanations needed, just answer the question based on the provided information. Generate only humanized (American male) answers to the questions.
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
  
    // var.update $messages {
    //   value = $messages|push:$system_message
    // }
  
    // Append prior conversation history (each item must have role + content)
    conditional {
      if ($input.history != null && ($input.history|count) > 0) {
        foreach ($input.history) {
          each as $turn {
            var.update $messages {
              value = $messages|push:$turn
            }
          }
        }
      }
    }
  
    // Build current user message — may include PDF file blocks
    var $user_content {
      value = []
    }
  
    conditional {
      if ($input.resume_base64 != null && ($input.resume_base64|strlen) > 0) {
        var $resume_block {
          value = {}
            |set:"type":"file"
            |set:"file":({}
              |set:"filename":"resume.pdf"
              |set:"file_data":$input.resume_base64
            )
        }
      
        var.update $user_content {
          value = $user_content|push:$resume_block
        }
      }
    }
  
    conditional {
      if ($input.cover_letter_base64 != null && ($input.cover_letter_base64|strlen) > 0) {
        var $cover_block {
          value = {}
            |set:"type":"file"
            |set:"file":({}
              |set:"filename":"cover_letter.pdf"
              |set:"file_data":$input.cover_letter_base64
            )
        }
      
        var.update $user_content {
          value = $user_content|push:$cover_block
        }
      }
    }
  
    // Append the text question
    var $text_block {
      value = {}
        |set:"type":"text"
        |set:"text":$input.question
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
            |set:"max_tokens":1000
            |set:"temperature":0.5
            |set:"system":$system_content
            |set:"messages":$messages
          headers = []
            |push:"Content-Type: application/json"
            |push:$claude_auth
            |push:"anthropic-version: 2023-06-01"
          timeout = 60
        } as $anthropic_resp
      
        var.update $reply {
          value = $anthropic_resp.response.result.content
            |first
            |get:"text"
            |trim
        }
      
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
          }
        } as $chat_record
      }
    }
  }

  response = {answer: $reply}
}