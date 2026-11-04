// Resolve which resume sections / fields the user wants rendered, as a flat object of booleans.
// Order: built-in defaults -> legacy profile flags (include_certifications, include_key_projects)
// -> profile.resume_sections overrides (only known keys with boolean values are honoured).
// Never throws: on any problem the defaults (plus whatever was resolved so far) are returned.
function "resume/resolve_section_preferences" {
  description = "Resolve resume section/field visibility preferences from a profile record"

  input {
    json profile? {
      description = "Profile record (resume_sections, include_certifications, include_key_projects)"
    }
  }

  stack {
    var $prefs {
      value = {
        name                   : true
        headline               : false
        location               : true
        email                  : true
        phone                  : true
        linkedin               : true
        github                 : false
        summary                : false
        work_experience        : true
        work_position_title    : true
        work_company_name      : true
        work_location          : true
        work_date              : true
        work_bullets           : true
        education              : true
        edu_university_name    : true
        edu_degree             : true
        edu_field_of_study     : true
        edu_location           : true
        edu_date               : true
        edu_highlights         : true
        edu_relevant_coursework: true
        certifications         : true
        cert_name              : true
        cert_issuer            : true
        cert_date              : true
        cert_link              : true
        portfolio_projects     : true
        leadership             : true
        technical_skills       : true
        languages              : false
      }
    }

    try_catch {
      try {
        var $p {
          value = $input.profile
        }

        conditional {
          if ($p != null && ($p|is_object)) {
            // Legacy flags: only an explicit false disables the section
            var $legacy_certs {
              value = ($p|get:"include_certifications":null)|json_encode
            }

            conditional {
              if ($legacy_certs == "false") {
                var.update $prefs {
                  value = $prefs|set:"certifications":false
                }
              }
            }

            var $legacy_projects {
              value = ($p|get:"include_key_projects":null)|json_encode
            }

            conditional {
              if ($legacy_projects == "false") {
                var.update $prefs {
                  value = $prefs|set:"portfolio_projects":false
                }
              }
            }

            var $sections {
              value = $p|get:"resume_sections":null
            }

            // Tolerate resume_sections stored as a JSON string
            conditional {
              if ($sections != null && ($sections|is_text)) {
                var $sections_text {
                  value = $sections|trim
                }

                conditional {
                  if (($sections_text|substr:0:1) == "{") {
                    var.update $sections {
                      value = $sections_text|json_decode
                    }
                  }
                }
              }
            }

            conditional {
              if ($sections != null && ($sections|is_object)) {
                var $pref_keys {
                  value = $prefs|keys
                }

                foreach ($pref_keys) {
                  each as $key {
                    var $override {
                      value = ($sections|get:$key:null)|json_encode
                    }

                    conditional {
                      if ($override == "true") {
                        var.update $prefs {
                          value = $prefs|set:$key:true
                        }
                      }

                      elseif ($override == "false") {
                        var.update $prefs {
                          value = $prefs|set:$key:false
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      catch {
        debug.log {
          value = "resolve_section_preferences failed, using defaults: " ~ $error
        }
      }
    }
  }

  response = $prefs
}
