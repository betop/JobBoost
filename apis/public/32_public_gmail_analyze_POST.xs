// Analyze Gmail batch prompt using Claude Haiku 4.5 via Anthropic API
query "public/gmail-analyze" verb=POST {
  api_group = "public"

  input {
    text system_prompt?
    text user_prompt?
  }

  stack {
    precondition ($input.system_prompt != null && $input.system_prompt != "") {
      error_type = "badrequest"
      error = "system_prompt is required"
    }
  
    precondition ($input.user_prompt != null && $input.user_prompt != "") {
      error_type = "badrequest"
      error = "user_prompt is required"
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
            |set:"max_tokens":2500
            |set:"temperature":0
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
  
    precondition ($ai_response != null && $ai_response != "") {
      error = "Claude returned empty response"
    }
  }

  response = {ai_response: $ai_response}
}