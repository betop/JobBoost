// Create a rule
query rules verb=POST {
  api_group = "rules"
  auth = "admin"

  input {
    text sentence?
    text target_section?
    bool is_active?
  }

  stack {
    precondition ($input.sentence != null && $input.target_section != null) {
      error_type = "badrequest"
      error = "sentence and target_section are required"
    }
  
    db.add rule {
      data = {
        created_at         : now
        sentence           : $input.sentence
        target_section     : $input.target_section
        is_active          : $input.is_active
        created_by_admin_id: $auth.id
        updated_at         : now
      }
    } as $r
  }

  response = $r
}