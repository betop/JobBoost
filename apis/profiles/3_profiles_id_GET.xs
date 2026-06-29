// Get profile by id (includes education + work)
// Admins can only access profiles they created or are assigned to
query "profiles/{id}" verb=GET {
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
  
    // Access control: admins can only see their own created/assigned profiles
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    conditional {
      if ($auth_user.type != "super_admin") {
        var $has_access {
          value = false
        }
      
        // Check if created by this admin
        conditional {
          if ($p.created_by == $auth.id) {
            var.update $has_access {
              value = true
            }
          }
        }
      
        // Check if assigned to this admin
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
            is_current     : $w.is_current
          }
        }
      }
    }
  
    var $profile_out {
      value = {
        id                    : $p.id
        full_name             : $p.full_name
        email                 : $p.email
        phone                 : $p.phone_number
        location              : $p.location
        linkedin              : $p.linkedin_url
        github                : $p.github_url
        job_category          : $p.job_category
        resume_template       : $p.resume_template
        created_at            : $p.created_at
        include_key_projects  : $p.include_key_projects
        include_certifications: $p.include_certifications
        include_achievements  : $p.include_achievements
        education             : $education_out
        work_experience       : $work_out
      }
    }
  }

  response = $profile_out
}