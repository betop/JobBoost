// Fetch a single generation log entry by log_id using token auth
// Used by the chat bubble to display profile/job info for the last successful generation
query "logs/entry" verb=GET {
  api_group = "logs"

  input {
    text token?
    text log_id?
  }

  stack {
    precondition ($input.token != null) {
      error_type = "accessdenied"
      error = "Missing authorization key"
    }
  
    precondition ($input.log_id != null) {
      error_type = "badrequest"
      error = "log_id is required"
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
  
    // Fetch the log entry
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Log entry not found"
    }
  }

  response = {
    log_id        : $log.id
    position_title: $log.position_title
    company_name  : $log.company_name
    created_at    : $log.created_at
  }
}