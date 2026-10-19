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
    json certifications?
    bool clear_certifications? {
      description = "Set true to remove all of the profile's certifications (an empty list alone never clears them)"
    }
    json work_experience?
    bool include_key_projects?
    bool include_certifications?
    bool include_achievements?
    bool use_legacy_api?
    bool hide?
    bool block_lead_roles?
    bool tailor_job_title?
    text allowed_languages?
    text ai_model?
    text default_compensation?
    uuid billing_admin_id?
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
  
    var $p_before_email {
      value = $p.email
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
      if ($input.job_category != null) {
        var.update $payload.job_category {
          value = $input.job_category
        }
      }
    }
  
    conditional {
      if ($input.resume_template != null) {
        conditional {
          if ($auth_user.type != "super_admin") {
            db.get template_visibility {
              field_name = "id"
              field_value = 1
            } as $cfg

            conditional {
              if ($cfg != null && $cfg.admin_visible_template_ids != null && $cfg.admin_visible_template_ids != "") {
                var $template_allowed {
                  value = false
                }

                foreach (($cfg.admin_visible_template_ids|split:",")) {
                  each as $tid {
                    conditional {
                      if (($tid|trim) != "" && $input.resume_template == ($tid|trim|to_int)) {
                        var.update $template_allowed {
                          value = true
                        }
                      }
                    }
                  }
                }

                precondition ($template_allowed) {
                  error_type = "accessdenied"
                  error = "Selected template is hidden by super admin"
                }
              }
            }
          }
        }

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
  
    var $block_lead_roles_changed {
      value = $input.block_lead_roles|json_encode
    }
  
    conditional {
      if ($block_lead_roles_changed != "") {
        var.update $payload.block_lead_roles {
          value = $input.block_lead_roles
        }
      }
    }
  
    var $tailor_job_title_changed {
      value = $input.tailor_job_title|json_encode
    }
  
    conditional {
      if ($tailor_job_title_changed != "") {
        var.update $payload.tailor_job_title {
          value = $input.tailor_job_title
        }
      }
    }
  
    conditional {
      if ($input.allowed_languages != null) {
        var.update $payload.allowed_languages {
          value = $input.allowed_languages
        }
      }
    }
  
    conditional {
      if ($input.ai_model != null) {
        function.run "ai/resolve_model" {
          input = {ai_model: $input.ai_model}
        } as $new_ai_model

        var.update $payload.ai_model {
          value = $new_ai_model
        }
      }
    }

  
    conditional {
      if ($input.default_compensation != null) {
        var.update $payload.default_compensation {
          value = $input.default_compensation
        }
      }
    }
  
    // Only a super_admin may change the billing admin; must be an active admin
    conditional {
      if ($input.billing_admin_id != null && $auth_user.type == "super_admin") {
        db.get users {
          field_name = "id"
          field_value = $input.billing_admin_id
        } as $chosen_admin
      
        precondition ($chosen_admin != null && $chosen_admin.type == "admin" && $chosen_admin.is_active == true) {
          error_type = "badrequest"
          error = "billing_admin_id must be an active admin"
        }
      
        var.update $payload.billing_admin_id {
          value = $chosen_admin.id
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
  
    // Auto-allowlist a changed profile email for Mail Triage (non-fatal; old emails stay on the list)
    conditional {
      if ($input.email != null && $input.email != "" && $input.email != $p_before_email) {
        try_catch {
          try {
            function.run "mail_triage/ensure_allowlisted" {
              input = {email: $input.email, notes: "Auto-added from profile " ~ ($p.full_name|first_notnull:"")}
            } as $allowlisted
          }
          catch {
            debug.log {
              value = "ensure_allowlisted failed for profile " ~ $p.id
            }
          }
        }
      }
    }
  
    // Certifications: replace the list only when the caller sends some, or explicitly clears it.
    // An omitted field arrives as an empty list, so an empty list alone must NOT delete anything.
    var $replace_certs {
      value = false
    }

    conditional {
      if ((($input.certifications|first_notnull:[])|count) > 0) {
        var.update $replace_certs {
          value = true
        }
      }
    }

    conditional {
      if ($input.clear_certifications == true) {
        var.update $replace_certs {
          value = true
        }
      }
    }

    conditional {
      if ($replace_certs) {
        db.query certification {
          where = $db.certification.profile_id == $p.id
          return = {type: "list"}
        } as $cert_list

        foreach ($cert_list) {
          each as $old_cert {
            db.del certification {
              field_name = "id"
              field_value = $old_cert.id
            }
          }
        }

        foreach ($input.certifications) {
          each as $cd {
            db.add certification {
              data = {
                created_at : now
                profile_id : $p.id
                name       : ($cd|get:"name")
                issuer     : ($cd|get:"issuer")
                issued_date: ($cd|get:"date")
                url        : ($cd|get:"url")
                updated_at : now
              }
            } as $new_cert
          }
        }
      }
    }

    conditional {
      if ((($input.education|first_notnull:[])|count) > 0) {
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
      if ((($input.work_experience|first_notnull:[])|count) > 0) {
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
  
    db.query certification {
      where = $db.certification.profile_id == $p.id
      sort = {certification.created_at: "asc"}
      return = {type: "list"}
    } as $certifications

    var $certifications_out {
      value = []
    }

    foreach ($certifications) {
      each as $cr {
        array.push $certifications_out {
          value = {
            id    : $cr.id
            name  : $cr.name
            issuer: $cr.issuer
            date  : $cr.issued_date
            url   : $cr.url
          }
        }
      }
    }

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
    billing_admin_id: $p.billing_admin_id
    education      : $education_out
    certifications : $certifications_out
    work_experience: $work_out
  }

  guid = "V6dPtigWDi30Vm3nFfof1ItaJIg"
}