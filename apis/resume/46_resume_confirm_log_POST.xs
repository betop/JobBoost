// Confirm a log entry — set is_applied = true
// Called when user clicks "Generate Anyway" on repost or mismatch warnings
query "resume/confirm_log" verb=POST {
  api_group = "resume"

  input {
    uuid log_id?
    text token?
  }

  stack {
    precondition ($input.log_id != null) {
      error_type = "badrequest"
      error = "log_id is required"
    }
  
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing authorization key"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid key"
    }
  
    precondition ($access.is_active) {
      error_type = "accessdenied"
      error = "Key has been revoked"
    }
  
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Log not found"
    }
  
    // Verify the log belongs to the same user
    precondition ($log.user_id == $access.user_id) {
      error_type = "accessdenied"
      error = "Access denied"
    }
  
    // Mark as applied
    db.edit generation_log {
      field_name = "id"
      field_value = $input.log_id
      enforce_hidden_fields = false
      data = {is_applied: true, updated_at: now}
    } as $updated_log
  }

  response = {success: true, log_id: $updated_log.id}
}