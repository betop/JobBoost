// Delete profile (only if not linked to bidder)
query "profiles/{id}" verb=DELETE {
  api_group = "profiles"
  auth = "admin"

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
  
    db.query bidder {
      where = $db.bidder.profile_id == $p.id
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
}