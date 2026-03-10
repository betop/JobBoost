// List profiles
query profiles verb=GET {
  api_group = "profiles"
  auth = "admin"

  input {
  }

  stack {
    db.query profile {
      sort = {profile.created_at: "desc"}
      return = {type: "list"}
    } as $profiles
  
    var $out {
      value = []
    }
  
    foreach ($profiles) {
      each as $p {
        var $mapped {
          value = {
            id             : $p.id
            full_name      : $p.full_name
            email          : $p.email
            phone          : $p.phone_number
            location       : $p.location
            linkedin       : $p.linkedin_url
            github         : $p.github_url
            job_category   : $p.job_category
            created_at     : $p.created_at
            education      : []
            work_experience: []
          }
        }
      
        array.push $out {
          value = $mapped
        }
      }
    }
  }

  response = $out
}