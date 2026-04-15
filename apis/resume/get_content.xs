// Fetch saved AI response for a generation log by content_id
// Used by admin panel to download resume PDFs from historical logs
query "resume/get_content" verb=GET {
  api_group = "resume"
  auth = "users"

  input {
    uuid content_id?
  }

  stack {
    precondition ($input.content_id != null) {
      error_type = "badrequest"
      error = "content_id is required"
    }
  
    // Only admins can fetch resume content
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    precondition ($auth_user != null && ($auth_user.type == "admin" || $auth_user.type == "super_admin")) {
      error_type = "accessdenied"
      error = "Admin access required"
    }
  
    db.get resume_content {
      field_name = "id"
      field_value = $input.content_id
    } as $content
  
    precondition ($content != null) {
      error_type = "notfound"
      error = "Content not found"
    }
  }

  response = {id: $content.id, raw_response: $content.raw_response}
}