// Deterministically apply the user's section / field visibility preferences to a generated
// resume, after the AI JSON is parsed and before it is stored or rendered.
// - removes hidden header fields / sections / per-entry fields
// - normalizes kept dates to "Mon YYYY" via resume/format_month_year
// - education location only comes from the education table (never the AI text)
// - strips spoken human languages out of technical_skills; languages come from the profile
// The PDF renderer flattens header into the root with root keys winning, so every header
// key that is removed / set is also removed / set at the root when present there.
// Never throws: on any problem the original resume is returned.
function "resume/apply_section_preferences" {
  description = "Apply resume section/field preferences (visibility, date format, languages) to a generated resume"

  input {
    json resume? {
      description = "Parsed resume object produced by the AI"
    }

    json profile? {
      description = "Profile record (location, github_url, spoken_languages, resume_sections, ...)"
    }

    json education_records? {
      description = "Rows of the education table (university_name, degree_title, field_of_study, start_date, end_date, location)"
    }

    json prefs? {
      description = "Output of resume/resolve_section_preferences; resolved from the profile when null"
    }
  }

  stack {
    var $result {
      value = $input.resume
    }

    try_catch {
      try {
        var $resume_is_object {
          value = $input.resume != null && ($input.resume|is_object)
        }

        conditional {
          if ($resume_is_object) {
            var $p {
              value = {}
            }

            conditional {
              if ($input.profile != null && ($input.profile|is_object)) {
                var.update $p {
                  value = $input.profile
                }
              }
            }

            // ==================== PREFERENCES ====================
            // Always start from the fully resolved set so every key exists, then overlay
            // any boolean values passed in explicitly.
            function.run "resume/resolve_section_preferences" {
              input = {profile: $p}
            } as $resolved_prefs

            var $prefs {
              value = $resolved_prefs
            }

            conditional {
              if ($input.prefs != null && ($input.prefs|is_object)) {
                var $resolved_keys {
                  value = $resolved_prefs|keys
                }

                foreach ($resolved_keys) {
                  each as $pk {
                    var $given {
                      value = ($input.prefs|get:$pk:null)|json_encode
                    }

                    conditional {
                      if ($given == "true") {
                        var.update $prefs {
                          value = $prefs|set:$pk:true
                        }
                      }

                      elseif ($given == "false") {
                        var.update $prefs {
                          value = $prefs|set:$pk:false
                        }
                      }
                    }
                  }
                }
              }
            }

            var $out {
              value = $input.resume
            }

            var $header {
              value = {}
            }

            var $write_header {
              value = false
            }

            var $existing_header {
              value = $out|get:"header":null
            }

            conditional {
              if ($existing_header != null && ($existing_header|is_object)) {
                var.update $header {
                  value = $existing_header
                }

                var.update $write_header {
                  value = true
                }
              }
            }

            // ==================== 1. HEADER FIELDS ====================
            var $header_fields {
              value = [
                {pref: "name", key: "name"}
                {pref: "headline", key: "title"}
                {pref: "location", key: "location"}
                {pref: "email", key: "email"}
                {pref: "phone", key: "phone"}
                {pref: "linkedin", key: "linkedin"}
                {pref: "github", key: "github"}
              ]
            }

            foreach ($header_fields) {
              each as $hf {
                var $hf_pref {
                  value = $hf|get:"pref"
                }

                var $hf_key {
                  value = $hf|get:"key"
                }

                var $hf_on {
                  value = $prefs|get:$hf_pref:true
                }

                conditional {
                  if ($hf_on == false) {
                    var.update $header {
                      value = $header|unset:$hf_key
                    }

                    var.update $out {
                      value = $out|unset:$hf_key
                    }
                  }
                }
              }
            }

            var $gh_raw {
              value = $p|get:"github_url":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($prefs.github == true && $gh_raw != "") {
                // display = url without scheme / www. / query / trailing slash (e.g. github.com/jdoe)
                var $gh_display {
                  value = "/^https?:\\/\\//i"|regex_replace:"":$gh_raw
                }

                var.update $gh_display {
                  value = "/^www\\./i"|regex_replace:"":$gh_display
                }

                var.update $gh_display {
                  value = "/[?#].*$/"|regex_replace:"":$gh_display
                }

                var.update $gh_display {
                  value = "/\\/+$/"|regex_replace:"":$gh_display
                }

                var.update $gh_display {
                  value = $gh_display|trim
                }

                var $gh_has_scheme {
                  value = "/^https?:\\/\\//i"|regex_matches:$gh_raw
                }

                var $gh_url {
                  value = $gh_raw
                }

                conditional {
                  if (!$gh_has_scheme) {
                    var $gh_no_slash {
                      value = "/^\\/+/"|regex_replace:"":$gh_raw
                    }

                    var.update $gh_url {
                      value = "https://" ~ $gh_no_slash
                    }
                  }
                }

                conditional {
                  if ($gh_display != "") {
                    var $gh_obj {
                      value = {display: $gh_display, url: $gh_url}
                    }

                    var.update $header {
                      value = $header|set:"github":$gh_obj
                    }

                    var.update $write_header {
                      value = true
                    }

                    conditional {
                      if (($out|get:"github":null) != null) {
                        var.update $out {
                          value = $out|set:"github":$gh_obj
                        }
                      }
                    }
                  }
                }
              }
            }

            // ==================== 2. SUMMARY ====================
            conditional {
              if ($prefs.summary == false) {
                var.update $out {
                  value = $out|unset:"summary"
                }

                var.update $header {
                  value = $header|unset:"summary"
                }
              }
            }

            // ==================== 3. WORK EXPERIENCE ====================
            var $src_jobs {
              value = $out|get:"career_breakdowns":null
            }

            conditional {
              if ($prefs.work_experience == false) {
                var.update $out {
                  value = $out|unset:"career_breakdowns"
                }
              }

              elseif ($src_jobs != null && ($src_jobs|is_array)) {
                var $clean_jobs {
                  value = []
                }

                foreach ($src_jobs) {
                  each as $job {
                    var $job_clean {
                      value = $job
                    }

                    conditional {
                      if ($job|is_object) {
                        conditional {
                          if ($prefs.work_position_title == false) {
                            var.update $job_clean {
                              value = $job_clean|unset:"title"|unset:"job_title"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.work_company_name == false) {
                            var.update $job_clean {
                              value = $job_clean|unset:"company"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.work_location == false) {
                            var.update $job_clean {
                              value = $job_clean|unset:"location"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.work_bullets == false) {
                            var.update $job_clean {
                              value = $job_clean|unset:"bullets"|unset:"highlights"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.work_date == false) {
                            var.update $job_clean {
                              value = $job_clean|unset:"date_range"|unset:"start"|unset:"end"
                            }
                          }

                          else {
                            var $job_range {
                              value = $job_clean|get:"date_range":null
                            }

                            conditional {
                              if ($job_range != null) {
                                function.run "resume/format_month_year" {
                                  input = {value: $job_range|to_text}
                                } as $job_range_fmt

                                var.update $job_clean {
                                  value = $job_clean|set:"date_range":$job_range_fmt
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    array.push $clean_jobs {
                      value = $job_clean
                    }
                  }
                }

                var.update $out {
                  value = $out|set:"career_breakdowns":$clean_jobs
                }
              }
            }

            // ==================== 4. EDUCATION ====================
            // Pre-normalize the education table rows for institution matching
            var $edu_rows {
              value = []
            }

            conditional {
              if ($input.education_records != null && ($input.education_records|is_array)) {
                foreach ($input.education_records) {
                  each as $er {
                    conditional {
                      if ($er != null && ($er|is_object)) {
                        var $er_name {
                          value = $er|get:"university_name":null|first_notnull:""|to_text|trim|to_lower
                        }

                        var $er_location {
                          value = $er|get:"location":null|first_notnull:""|to_text|trim
                        }

                        var $er_end {
                          value = $er|get:"end_date":null|first_notnull:""|to_text|trim
                        }

                        conditional {
                          if ($er_name != "") {
                            array.push $edu_rows {
                              value = {name: $er_name, location: $er_location, end_date: $er_end}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            var $profile_location {
              value = $p|get:"location":null|first_notnull:""|to_text|trim
            }

            var $src_edu {
              value = $out|get:"education":null
            }

            conditional {
              if ($prefs.education == false) {
                var.update $out {
                  value = $out|unset:"education"
                }
              }

              elseif ($src_edu != null && ($src_edu|is_array)) {
                var $clean_edu {
                  value = []
                }

                foreach ($src_edu) {
                  each as $ed {
                    var $ed_clean {
                      value = $ed
                    }

                    conditional {
                      if ($ed|is_object) {
                        // Match against the education table BEFORE any field is removed
                        var $ed_school {
                          value = $ed|get:"school":null|first_notnull:""
                        }

                        var $ed_inst {
                          value = $ed|get:"institution":null|first_notnull:$ed_school|to_text|trim|to_lower
                        }

                        var $ed_match {
                          value = null
                        }

                        var $ed_loc_match {
                          value = null
                        }

                        conditional {
                          if ($ed_inst != "") {
                            foreach ($edu_rows) {
                              each as $row {
                                var $row_name {
                                  value = $row|get:"name":""
                                }

                                var $row_location {
                                  value = $row|get:"location":""
                                }

                                var $is_same {
                                  value = $row_name == $ed_inst || ($row_name|contains:$ed_inst) || ($ed_inst|contains:$row_name)
                                }

                                conditional {
                                  if ($is_same) {
                                    conditional {
                                      if ($ed_match == null) {
                                        var.update $ed_match {
                                          value = $row
                                        }
                                      }
                                    }

                                    conditional {
                                      if ($ed_loc_match == null && $row_location != "") {
                                        var.update $ed_loc_match {
                                          value = $row
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }

                        // Location: only the DB row's location, only when the profile has a location
                        var $keep_location {
                          value = $prefs.edu_location == true && $profile_location != "" && $ed_loc_match != null
                        }

                        conditional {
                          if ($keep_location) {
                            var $db_location {
                              value = $ed_loc_match|get:"location":""
                            }

                            var.update $ed_clean {
                              value = $ed_clean|set:"location":$db_location
                            }
                          }

                          else {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"location"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_university_name == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"institution"|unset:"school"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_degree == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"degree"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_field_of_study == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"major"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_highlights == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"highlights"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_relevant_coursework == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"Relevant"|unset:"relevant"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.edu_date == false) {
                            var.update $ed_clean {
                              value = $ed_clean|unset:"year"|unset:"date"|unset:"end"
                            }
                          }

                          else {
                            foreach (["year", "date", "end"]) {
                              each as $dk {
                                var $ed_date_val {
                                  value = $ed_clean|get:$dk:null
                                }

                                conditional {
                                  if ($ed_date_val != null) {
                                    function.run "resume/format_month_year" {
                                      input = {value: $ed_date_val|to_text}
                                    } as $ed_date_fmt

                                    var.update $ed_clean {
                                      value = $ed_clean|set:$dk:$ed_date_fmt
                                    }
                                  }
                                }
                              }
                            }

                            // Fill a missing year from the education table end_date
                            var $ed_year {
                              value = $ed_clean|get:"year":null|first_notnull:""|to_text|trim
                            }

                            var $match_end {
                              value = ""
                            }

                            conditional {
                              if ($ed_match != null) {
                                var.update $match_end {
                                  value = $ed_match|get:"end_date":""
                                }
                              }
                            }

                            conditional {
                              if ($ed_year == "" && $match_end != "") {
                                function.run "resume/format_month_year" {
                                  input = {value: $match_end}
                                } as $ed_end_fmt

                                conditional {
                                  if ($ed_end_fmt != "") {
                                    var.update $ed_clean {
                                      value = $ed_clean|set:"year":$ed_end_fmt
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    array.push $clean_edu {
                      value = $ed_clean
                    }
                  }
                }

                var.update $out {
                  value = $out|set:"education":$clean_edu
                }
              }
            }

            // ==================== 5. CERTIFICATIONS ====================
            var $src_certs {
              value = $out|get:"certifications":null
            }

            conditional {
              if ($prefs.certifications == false) {
                var.update $out {
                  value = $out|unset:"certifications"
                }
              }

              elseif ($src_certs != null && ($src_certs|is_array)) {
                var $clean_certs {
                  value = []
                }

                foreach ($src_certs) {
                  each as $ct {
                    var $ct_clean {
                      value = $ct
                    }

                    conditional {
                      if ($ct|is_object) {
                        conditional {
                          if ($prefs.cert_name == false) {
                            var.update $ct_clean {
                              value = $ct_clean|unset:"name"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.cert_issuer == false) {
                            var.update $ct_clean {
                              value = $ct_clean|unset:"issuer"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.cert_link == false) {
                            var.update $ct_clean {
                              value = $ct_clean|unset:"url"
                            }
                          }
                        }

                        conditional {
                          if ($prefs.cert_date == false) {
                            var.update $ct_clean {
                              value = $ct_clean|unset:"date"
                            }
                          }

                          else {
                            var $ct_date {
                              value = $ct_clean|get:"date":null
                            }

                            conditional {
                              if ($ct_date != null) {
                                function.run "resume/format_month_year" {
                                  input = {value: $ct_date|to_text}
                                } as $ct_date_fmt

                                var.update $ct_clean {
                                  value = $ct_clean|set:"date":$ct_date_fmt
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    array.push $clean_certs {
                      value = $ct_clean
                    }
                  }
                }

                var.update $out {
                  value = $out|set:"certifications":$clean_certs
                }
              }
            }

            // ==================== 6. PROJECTS / LEADERSHIP ====================
            conditional {
              if ($prefs.portfolio_projects == false) {
                var.update $out {
                  value = $out|unset:"portfolio_projects"|unset:"key_projects"|unset:"projects"
                }
              }
            }

            conditional {
              if ($prefs.leadership == false) {
                var.update $out {
                  value = $out|unset:"leadership_enterpreneurial_experience"|unset:"leadership"
                }
              }
            }

            // ==================== 7. TECHNICAL SKILLS ====================
            var $src_skills {
              value = $out|get:"technical_skills":null
            }

            conditional {
              if ($prefs.technical_skills == false) {
                var.update $out {
                  value = $out|unset:"technical_skills"|unset:"skills"
                }
              }

              elseif ($src_skills != null && ($src_skills|is_object)) {
                // Lower-case lookup of spoken human languages
                var $spoken_map {
                  value = {
                    english   : true
                    spanish   : true
                    french    : true
                    german    : true
                    portuguese: true
                    italian   : true
                    dutch     : true
                    polish    : true
                    russian   : true
                    ukrainian : true
                    turkish   : true
                    arabic    : true
                    hindi     : true
                    chinese   : true
                    mandarin  : true
                    cantonese : true
                    japanese  : true
                    korean    : true
                    vietnamese: true
                    thai      : true
                    indonesian: true
                    malay     : true
                    swedish   : true
                    norwegian : true
                    danish    : true
                    finnish   : true
                    greek     : true
                    czech     : true
                    romanian  : true
                    hungarian : true
                    hebrew    : true
                    bengali   : true
                    urdu      : true
                    punjabi   : true
                    tamil     : true
                    telugu    : true
                    tagalog   : true
                    filipino  : true
                    persian   : true
                    farsi     : true
                    swahili   : true
                    serbian   : true
                    croatian  : true
                    bulgarian : true
                    slovak    : true
                  }
                }

                var $clean_skills {
                  value = {}
                }

                var $skill_keys {
                  value = $src_skills|keys
                }

                foreach ($skill_keys) {
                  each as $sk {
                    var $sk_lower {
                      value = $sk|to_text|to_lower
                    }

                    var $sk_val {
                      value = $src_skills|get:$sk:null
                    }

                    var $sk_is_array {
                      value = $sk_val != null && ($sk_val|is_array)
                    }

                    var $sk_is_text {
                      value = $sk_val != null && ($sk_val|is_text)
                    }

                    conditional {
                      if ($sk_lower == "spoken_languages" || $sk_lower == "human_languages") {
                        // Dropped: languages are rendered from the profile, never as a skill
                        debug.log {
                          value = "apply_section_preferences: dropped technical_skills." ~ $sk
                        }
                      }

                      elseif ($sk_is_array || $sk_is_text) {
                        var $sk_items {
                          value = $sk_val
                        }

                        conditional {
                          if ($sk_is_text) {
                            var.update $sk_items {
                              value = $sk_val|split:","
                            }
                          }
                        }

                        var $kept_items {
                          value = []
                        }

                        foreach ($sk_items) {
                          each as $item {
                            var $item_text {
                              value = $item|first_notnull:""|to_text|trim
                            }

                            conditional {
                              if ($item_text != "") {
                                // Base word: drop a trailing "(...)" and proficiency words
                                var $base {
                                  value = "/\\s*\\([^)]*\\)\\s*$/"|regex_replace:"":$item_text
                                }

                                var.update $base {
                                  value = "/\\b(native|fluent|professional|conversational|basic|proficient|bilingual|intermediate|advanced)\\b/i"|regex_replace:"":$base
                                }

                                var.update $base {
                                  value = "/^[\\s\\-:;,]+|[\\s\\-:;,]+$/"|regex_replace:"":$base
                                }

                                var.update $base {
                                  value = $base|trim|to_lower
                                }

                                var $is_spoken {
                                  value = $base != "" && ($spoken_map|has:$base)
                                }

                                conditional {
                                  if (!$is_spoken) {
                                    array.push $kept_items {
                                      value = $item_text
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }

                        conditional {
                          if (($kept_items|count) > 0) {
                            conditional {
                              if ($sk_is_array) {
                                var.update $clean_skills {
                                  value = $clean_skills|set:$sk:$kept_items
                                }
                              }

                              else {
                                var.update $clean_skills {
                                  value = $clean_skills|set:$sk:($kept_items|join:", ")
                                }
                              }
                            }
                          }
                        }
                      }

                      elseif ($sk_val != null) {
                        // Unknown value type: keep as-is
                        var.update $clean_skills {
                          value = $clean_skills|set:$sk:$sk_val
                        }
                      }
                    }
                  }
                }

                var.update $out {
                  value = $out|set:"technical_skills":$clean_skills
                }
              }
            }

            // ==================== 8. LANGUAGES ====================
            var $spoken_raw {
              value = $p|get:"spoken_languages":null
            }

            var $lang_items {
              value = []
            }

            conditional {
              if ($prefs.languages == true && $spoken_raw != null) {
                var $spoken_list {
                  value = []
                }

                conditional {
                  if ($spoken_raw|is_array) {
                    var.update $spoken_list {
                      value = $spoken_raw
                    }
                  }

                  else {
                    var.update $spoken_list {
                      value = ($spoken_raw|to_text)|split:","
                    }
                  }
                }

                foreach ($spoken_list) {
                  each as $lang {
                    var $lang_text {
                      value = $lang|first_notnull:""|to_text|trim
                    }

                    conditional {
                      if ($lang_text != "") {
                        array.push $lang_items {
                          value = $lang_text
                        }
                      }
                    }
                  }
                }
              }
            }

            conditional {
              if (($lang_items|count) > 0) {
                var.update $out {
                  value = $out|set:"languages":$lang_items
                }
              }

              else {
                var.update $out {
                  value = $out|unset:"languages"
                }
              }
            }

            // Root wins in the renderer, but a header copy would still surface when the root is unset
            var.update $header {
              value = $header|unset:"languages"
            }

            // ==================== WRITE BACK ====================
            conditional {
              if ($write_header) {
                var.update $out {
                  value = $out|set:"header":$header
                }
              }
            }

            var.update $result {
              value = $out
            }
          }
        }
      }

      catch {
        debug.log {
          value = "apply_section_preferences failed, keeping resume unchanged: " ~ $error
        }

        var.update $result {
          value = $input.resume
        }
      }
    }
  }

  response = $result
  guid = "iccj4_wErOlK-489_1AVYhVzcL0"
}
