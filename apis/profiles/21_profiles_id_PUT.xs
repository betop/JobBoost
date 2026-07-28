// Update profile (optional nested replace)
// Admins can only update profiles they created or are assigned to
query "profiles/{id}" verb=PUT {
  api_group = "profiles"
  auth = "users"

  input {
    uuid id?
    text full_name?
    email email? filters=trim|lower
    text phone?
    text location?
    text linkedin?
    text github?
    text job_category?
    int resume_template?
    json education?
    json work_experience?
    bool include_key_projects?
    bool include_certifications?
    bool include_achievements?
    bool use_legacy_api?
    bool hide?
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
  
    // Access control: admins can only update their own created/assigned profiles
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
  
    var $phone_changed {
      value = $input.phone|json_encode
    }
  
    conditional {
      if ($phone_changed != "") {
        var.update $payload.phone_number {
          value = $input.phone
        }
      }
    }
  
    var $location_changed {
      value = $input.location|json_encode
    }
  
    conditional {
      if ($location_changed != "") {
        var.update $payload.location {
          value = $input.location
        }
      }
    }
  
    var $linkedin_changed {
      value = $input.linkedin|json_encode
    }
  
    conditional {
      if ($linkedin_changed != "") {
        var.update $payload.linkedin_url {
          value = $input.linkedin
        }
      }
    }
  
    var $github_changed {
      value = $input.github|json_encode
    }
  
    conditional {
      if ($github_changed != "") {
        var.update $payload.github_url {
          value = $input.github
        }
      }
    }
  
    var $job_category_changed {
      value = $input.job_category|json_encode
    }
  
    conditional {
      if ($job_category_changed != "") {
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
  
    var $include_key_projects_changed {
      value = $input.include_key_projects|json_encode
    }
  
    conditional {
      if ($include_key_projects_changed != "") {
        var.update $payload.include_key_projects {
          value = $input.include_key_projects
        }
      }
    }
  
    var $include_certifications_changed {
      value = $input.include_certifications|json_encode
    }
  
    conditional {
      if ($include_certifications_changed != "") {
        var.update $payload.include_certifications {
          value = $input.include_certifications
        }
      }
    }
  
    var $include_achievements_changed {
      value = $input.include_achievements|json_encode
    }
  
    conditional {
      if ($include_achievements_changed != "") {
        var.update $payload.include_achievements {
          value = $input.include_achievements
        }
      }
    }
  
    var $use_legacy_api_changed {
      value = $input.use_legacy_api|json_encode
    }
  
    conditional {
      if ($use_legacy_api_changed != "") {
        var.update $payload.use_legacy_api {
          value = $input.use_legacy_api
        }
      }
    }

    var $hide_changed {
      value = $input.hide|json_encode
    }

    conditional {
      if ($hide_changed != "") {
        var.update $payload.hide {
          value = $input.hide
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
            } as $new_education
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
                is_current     : $wk.is_current
                updated_at     : now
              }
            } as $new_work
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
            is_current     : $wk.is_current
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
    job_category   : $p.job_category
    resume_template: $p.resume_template
    created_at     : $p.created_at
    education      : $education_out
    work_experience: $work_out
  }
  guid = "V6dPtigWDi30Vm3nFfof1ItaJIg"
}