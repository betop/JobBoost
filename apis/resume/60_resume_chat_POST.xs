// Chat assistant endpoint — proxies OpenAI GPT-4o keeping the API key server-side
// Accepts a question, optional conversation history and up to 2 PDF file contents (base64)
query "resume/chat" verb=POST {
  api_group = "resume"

  input {
    text token?
    text question?
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
  
    // ── Build messages array ──────────────────────────────────────────────
    var $system_message {
      value = {}
        |set:"role":"system"
        |set:"content":'You are a professional career coach and resume expert. Human writing help - Provide short, simple, clear, concise, and actionable answers on behalf of the user (The subject of all answers must be "I"). When reviewing documents, be specific and constructive. Keep responses professional yet approachable. No explanations needed, just answer the question based on the provided information.'
    }
  
    var $messages {
      value = []|push:$system_message
    }
  
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
    var $openai_auth {
      value = "Bearer " ~ $env.OPENAI_API_KEY
    }
  
    var $openai_body {
      value = {}
        |set:"model":"gpt-4o"
        |set:"max_tokens":1024
        |set:"temperature":0.5
        |set:"messages":$messages
    }
  
    var $reply {
      value = ""
    }
  
    try_catch {
      try {
        api.request {
          url = "https://api.openai.com/v1/chat/completions"
          method = "POST"
          params = $openai_body
          headers = []
            |push:"Content-Type: application/json"
            |push:"Authorization: " ~ $openai_auth
          timeout = 60
        } as $openai_resp
      
        var.update $reply {
          value = $openai_resp.response.result.choices
            |first
            |get:"message"
            |get:"content"
            |trim
        }
      }
    
      catch {
        debug.log {
          value = "OpenAI request failed: " ~ $error
        }
      
        var.update $reply {
          value = "Sorry, I couldn't get a response from the AI. Please try again."
        }
      }
    }
  }

  response = {answer: $reply}
}