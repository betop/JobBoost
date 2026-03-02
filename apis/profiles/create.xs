// Create profile with nested education + work
query profiles verb=POST {
  api_group = "profiles"
  auth = "admin"

  input {
    text full_name?
    email email? filters=trim|lower
    text phone?
    text location?
    text linkedin?
    text github?
    text summary?
    text job_category?
    json education
    json work_experience
  }

  stack {
    db.add profile {
      data = {
        created_at  : now
        full_name   : $input.full_name
        email       : $input.email
        phone_number: $input.phone
        location    : $input.location
        linkedin_url: $input.linkedin
        github_url  : $input.github
        summary     : $input.summary
        job_category: $input.job_category
        updated_at  : now
      }
    } as $p
  
    foreach ($input.education) {
      each as $e {
        db.add education {
          data = {
            created_at     : now
            profile_id     : $p.id
            university_name: $e.university
            degree_title   : $e.degree
            field_of_study : $e.field_of_study
            start_date     : $e.start_date
            end_date       : $e.end_date
            location       : $e.location
            updated_at     : now
          }
        }
      }
    }
  
    foreach ($input.work_experience) {
      each as $w {
        db.add work_experience {
          data = {
            created_at     : now
            profile_id     : $p.id
            job_title      : $w.job_title
            company_name   : $w.company
            employment_type: $w.employment_type
            location       : $w.location
            start_date     : $w.start_date
            end_date       : $w.end_date
            is_current     : ($w.end_date == null || $w.end_date == "")
            description    : $w.description
            updated_at     : now
          }
        }
      }
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
      each as $ed {
        array.push $education_out {
          value = {
            id            : $ed.id
            university    : $ed.university_name
            degree        : $ed.degree_title
            field_of_study: $ed.field_of_study
            start_date    : $ed.start_date
            end_date      : $ed.end_date
            location      : $ed.location
          }
        }
      }
    }
  
    var $work_out {
      value = []
    }
  
    foreach ($work) {
      each as $wk {
        array.push $work_out {
          value = {
            id             : $wk.id
            job_title      : $wk.job_title
            company        : $wk.company_name
            employment_type: $wk.employment_type
            location       : $wk.location
            start_date     : $wk.start_date
            end_date       : $wk.end_date
            description    : $wk.description
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
        created_at     : $p.created_at
        education      : $education_out
        work_experience: $work_out
      }
    }
  }

  response = $profile_out
}