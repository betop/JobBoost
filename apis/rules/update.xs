// Update a rule
query "rules/{id}" verb=PUT {
  api_group = "rules"
  auth = "admin"

  input {
    uuid id?
    text sentence?
    text target_section?
    bool is_active?
  }

  stack {
    db.get rule {
      field_name = "id"
      field_value = $input.id
    } as $r
  
    precondition ($r != null) {
      error_type = "notfound"
      error = "Rule not found"
    }
  
    var $payload {
      value = {}
    }
  
    conditional {
      if ($input.sentence != null) {
        var.update $payload.sentence {
          value = $input.sentence
        }
      }
    }
  
    conditional {
      if ($input.target_section != null) {
        var.update $payload.target_section {
          value = $input.target_section
        }
      }
    }
  
    conditional {
      if ($input.is_active != null) {
        var.update $payload.is_active {
          value = $input.is_active
        }
      }
    }
  
    var.update $payload.updated_at {
      value = now
    }
  
    db.patch rule {
      field_name = "id"
      field_value = $r.id
      data = $payload
    } as $r
  }

  response = $r
}