// Delete profile (only if not linked to bidder)
// Admins can only delete profiles they created or are assigned to
query "profiles/{id}" verb=DELETE {
  api_group = "profiles"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get profile {
      field_name = "id"
      field_value = $input.id
    } as $p
  
    precondition ($p != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    // Access control: admins can only delete their own created/assigned profiles
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    conditional {
      if ($auth_user.type != "super_admin") {
        var $has_access {
          value = false
        }
      
        conditional {
          if ($p.created_by == $auth.id) {
            var.update $has_access {
              value = true
            }
          }
        }
      
        conditional {
          if ($auth_user.profile_ids != null) {
            foreach ($auth_user.profile_ids) {
              each as $pid {
                conditional {
                  if ($pid == $p.id) {
                    var.update $has_access {
                      value = true
                    }
                  }
                }
              }
            }
          }
        }
      
        precondition ($has_access) {
          error_type = "accessdenied"
          error = "You do not have access to this profile"
        }
      }
    }
  
    db.query users {
      where = $db.users.profile_id == $p.id
      return = {type: "count"}
    } as $bidder_count
  
    precondition ($bidder_count == 0) {
      error_type = "accessdenied"
      error = "Profile is assigned to a bidder"
    }
  
    db.query education {
      where = $db.education.profile_id == $p.id
      return = {type: "list"}
    } as $edu_list
  
    foreach ($edu_list) {
      each as $e {
        db.del education {
          field_name = "id"
          field_value = $e.id
        }
      }
    }
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $p.id
      return = {type: "list"}
    } as $work_list
  
    foreach ($work_list) {
      each as $w {
        db.del work_experience {
          field_name = "id"
          field_value = $w.id
        }
      }
    }
  
    db.del profile {
      field_name = "id"
      field_value = $p.id
    }
  }

  response = {success: true}
  guid = "8L7JitSgSnzX6pGhLzA79_bU8j0"
}