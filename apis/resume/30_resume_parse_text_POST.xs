// Parse resume text using Claude AI
query "resume/parse-text" verb=POST {
  api_group = "resume"

  input {
    text system_prompt?
    text user_prompt?
  }

  stack {
    precondition ($input.system_prompt != null && $input.user_prompt != null) {
      error_type = "badrequest"
      error = "system_prompt and user_prompt are required"
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $ai_response {
      value = ""
    }
  
    try_catch {
      try {
        api.request {
          url = "https://api.anthropic.com/v1/messages"
          method = "POST"
          params = {}
            |set:"model":"claude-haiku-4-5"
            |set:"max_tokens":3000
            |set:"system":$input.system_prompt
            |set:"messages":([]
              |push:({}
                |set:"role":"user"
                |set:"content":$input.user_prompt
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
  }

  response = {ai_response: $ai_response}
}