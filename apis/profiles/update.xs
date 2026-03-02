// Update profile (optional nested replace)
query "profiles/{id}" verb=PUT {
  api_group = "profiles"
  auth = "admin"

  input {
    uuid id?
    text full_name?
    email email? filters=trim|lower
    text phone?
    text location?
    text linkedin?
    text github?
    text summary?
    text job_category?
    int resume_template?
    json education?
    json work_experience?
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
  
    var $payload {
      value = {}
    }
  
    conditional {
      if ($input.full_name != null) {
        var.update $payload.full_name {
          value = $input.full_name
        }
      }
    }
  
    conditional {
      if ($input.email != null) {
        var.update $payload.email {
          value = $input.email
        }
      }
    }
  
    conditional {
      if ($input.phone != null) {
        var.update $payload.phone_number {
          value = $input.phone
        }
      }
    }
  
    conditional {
      if ($input.location != null) {
        var.update $payload.location {
          value = $input.location
        }
      }
    }
  
    conditional {
      if ($input.linkedin != null) {
        var.update $payload.linkedin_url {
          value = $input.linkedin
        }
      }
    }
  
    conditional {
      if ($input.github != null) {
        var.update $payload.github_url {
          value = $input.github
        }
      }
    }
  
    conditional {
      if ($input.summary != null) {
        var.update $payload.summary {
          value = $input.summary
        }
      }
    }
  
    conditional {
      if ($input.job_category != null) {
        var.update $payload.job_category {
          value = $input.job_category
        }
      }
    }
  
    conditional {
      if ($input.resume_template != null) {
        var.update $payload.resume_template {
          value = $input.resume_template
        }
      }
    }
  
    var.update $payload.updated_at {
      value = now
    }
  
    db.patch profile {
      field_name = "id"
      field_value = $p.id
      data = $payload
    } as $p
  
    conditional {
      if ($input.education != null) {
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
      
        foreach ($input.education) {
          each as $ed {
            db.add education {
              data = {
                created_at     : now
                profile_id     : $p.id
                university_name: $ed.university
                degree_title   : $ed.degree
                field_of_study : $ed.field_of_study
                start_date     : $ed.start_date
                end_date       : $ed.end_date
                location       : $ed.location
                updated_at     : now
              }
            }
          }
        }
      }
    }
  
    conditional {
      if ($input.work_experience != null) {
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
      
        foreach ($input.work_experience) {
          each as $wk {
            var $is_current {
              value = $wk.end_date == null
            }
          
            db.add work_experience {
              data = {
                created_at     : now
                profile_id     : $p.id
                job_title      : $wk.job_title
                company_name   : $wk.company
                employment_type: $wk.employment_type
                location       : $wk.location
                start_date     : $wk.start_date
                end_date       : $wk.end_date
                is_current     : $is_current
                description    : $wk.description
                updated_at     : now
              }
            }
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
  }

  response = {
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