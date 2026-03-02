// Get profile by id (includes education + work)
query "profiles/{id}" verb=GET {
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
  
    db.query education {
      where = $db.education.profile_id == $p.id
      sort = {education.start_date: "desc"}
      return = {type: "list"}
    } as $education
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $p.id
      sort = {work_experience.start_date: "desc"}
      return = {type: "list"}
    } as $work
  
    var $education_out {
      value = []
    }
  
    foreach ($education) {
      each as $e {
        array.push $education_out {
          value = {
            id            : $e.id
            university    : $e.university_name
            degree        : $e.degree_title
            field_of_study: $e.field_of_study
            start_date    : $e.start_date
            end_date      : $e.end_date
            location      : $e.location
          }
        }
      }
    }
  
    var $work_out {
      value = []
    }
  
    foreach ($work) {
      each as $w {
        array.push $work_out {
          value = {
            id             : $w.id
            job_title      : $w.job_title
            company        : $w.company_name
            employment_type: $w.employment_type
            location       : $w.location
            start_date     : $w.start_date
            end_date       : $w.end_date
            description    : $w.description
          }
        }
      }
    }
  
    var $profile_out {
      value = {
        id             : $p.id
        full_name      : $p.full_name
        email          : $p.email
        phone          : $p.phone_number
        location       : $p.location
        linkedin       : $p.linkedin_url
        github         : $p.github_url
        summary        : $p.summary
        job_category   : $p.job_category
        resume_template: $p.resume_template
        created_at     : $p.created_at
        education      : $education_out
        work_experience: $work_out
      }
    }
  }

  response = $profile_out
}