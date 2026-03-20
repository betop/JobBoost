// Fetch current profiles for a Chrome extension token without side effects
query "public/token-profiles" verb=POST {
  api_group = "public"

  input {
    text token?
  }

  stack {
    precondition ($input.token != null && $input.token != "") {
      error_type = "accessdenied"
      error = "Missing token"
    }
  
    db.query access_token {
      where = $db.access_token.token == $input.token
      return = {type: "single"}
    } as $access
  
    precondition ($access != null) {
      error_type = "accessdenied"
      error = "Invalid token"
    }
  
    precondition ($access.is_active) {
      error_type = "accessdenied"
      error = "Token has been revoked"
    }
  
    db.get bidder {
      field_name = "id"
      field_value = $access.bidder_id
    } as $bid
  
    precondition ($bid != null) {
      error_type = "notfound"
      error = "Bidder not found"
    }
  
    precondition ($bid.is_active) {
      error_type = "accessdenied"
      error = "Bidder account is inactive"
    }
  
    var $profile_count {
      value = $bid.profile_ids|count
    }
  
    precondition ($profile_count > 0) {
      error_type = "notfound"
      error = "No profiles assigned to this bidder"
    }
  
    var $profile_names {
      value = []
    }
  
    var $resume_templates {
      value = []
    }
  
    foreach ($bid.profile_ids) {
      each as $pid {
        db.get profile {
          field_name = "id"
          field_value = $pid
        } as $prof
      
        conditional {
          if ($prof != null) {
            var.update $profile_names {
              value = $profile_names|push:$prof.full_name
            }
          
            var.update $resume_templates {
              value = $resume_templates|push:$prof.resume_template
            }
          }
        }
      }
    }
  }

  response = {
    profile_ids     : $bid.profile_ids
    profile_names   : $profile_names
    resume_templates: $resume_templates
  }
}