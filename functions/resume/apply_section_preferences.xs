// Deterministically apply the user's section / field visibility preferences to a generated
// resume, after the AI JSON is parsed and before it is stored or rendered.
// - removes hidden header fields / sections / per-entry fields
// - normalizes kept dates to "Mon YYYY" via resume/format_month_year
// - education location only comes from the education table (never the AI text)
// - strips spoken human languages out of technical_skills; languages come from the profile
// - drops internships when the work history spans more than 5 years and trims bullets per
//   entry to prefs.bullets_current / bullets_former / bullets_internship
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

    json work_records? {
      description = "Rows of the work_experience table (company_name, job_title, employment_type, start_date, end_date, is_current)"
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

                      elseif ("/^[0-9]+$/"|regex_matches:$given) {
                        // Integer prefs (bullet counts), already clamped by the resolver
                        var.update $prefs {
                          value = $prefs|set:$pk:($given|to_int)
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
            // Pre-normalize the work_experience rows for company matching
            var $work_rows {
              value = []
            }

            // Experience span in months (earliest start -> latest end, today for current /
            // open-ended rows). Stays -1 when unknown, in which case internships are kept.
            var $exp_today {
              value = now|format_timestamp:"Y-m-d":"UTC"
            }

            var $exp_today_year {
              value = $exp_today|substr:0:4|to_int
            }

            var $exp_today_month {
              value = $exp_today|substr:5:2|to_int
            }

            var $exp_today_months {
              value = ($exp_today_year * 12) + $exp_today_month
            }

            var $exp_min_start {
              value = 0
            }

            var $exp_max_end {
              value = 0
            }

            conditional {
              if ($input.work_records != null && ($input.work_records|is_array)) {
                foreach ($input.work_records) {
                  each as $wr {
                    conditional {
                      if ($wr != null && ($wr|is_object)) {
                        var $wr_name {
                          value = $wr|get:"company_name":null|first_notnull:""|to_text|trim|to_lower
                        }

                        var $wr_start {
                          value = $wr|get:"start_date":null|first_notnull:""|to_text|trim
                        }

                        var $wr_end {
                          value = $wr|get:"end_date":null|first_notnull:""|to_text|trim
                        }

                        var $wr_current {
                          value = ($wr|get:"is_current":false) == true
                        }

                        var $wr_title {
                          value = $wr|get:"job_title":null|first_notnull:""|to_text
                        }

                        var $wr_type {
                          value = $wr|get:"employment_type":null|first_notnull:""|to_text
                        }

                        var $wr_title_intern {
                          value = "/\\bintern(ship)?\\b/i"|regex_matches:$wr_title
                        }

                        var $wr_type_intern {
                          value = "/\\bintern(ship)?\\b/i"|regex_matches:$wr_type
                        }

                        var $wr_intern {
                          value = $wr_title_intern || $wr_type_intern
                        }

                        var $wr_has_start {
                          value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$wr_start
                        }

                        var $wr_has_end {
                          value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$wr_end
                        }

                        conditional {
                          if ($wr_has_start) {
                            var $wr_start_year {
                              value = $wr_start|substr:0:4|to_int
                            }

                            var $wr_start_month {
                              value = $wr_start|substr:5:2|to_int
                            }

                            var $wr_start_m {
                              value = ($wr_start_year * 12) + $wr_start_month
                            }

                            conditional {
                              if ($exp_min_start == 0 || $wr_start_m < $exp_min_start) {
                                var.update $exp_min_start {
                                  value = $wr_start_m
                                }
                              }
                            }
                          }
                        }

                        var $wr_end_m {
                          value = $exp_today_months
                        }

                        conditional {
                          if (!$wr_current && $wr_has_end) {
                            var $wr_end_year {
                              value = $wr_end|substr:0:4|to_int
                            }

                            var $wr_end_month {
                              value = $wr_end|substr:5:2|to_int
                            }

                            var.update $wr_end_m {
                              value = ($wr_end_year * 12) + $wr_end_month
                            }
                          }
                        }

                        conditional {
                          if ($wr_end_m > $exp_max_end) {
                            var.update $exp_max_end {
                              value = $wr_end_m
                            }
                          }
                        }

                        // Numeric sort keys from the ISO dates (2021-03-01 -> 20210301)
                        var $wr_start_digits {
                          value = "/[^0-9]/"|regex_replace:"":$wr_start
                        }

                        var $wr_end_digits {
                          value = "/[^0-9]/"|regex_replace:"":$wr_end
                        }

                        var $wr_start_key {
                          value = $wr_start_digits|first_notnull:"0"|to_int
                        }

                        var $wr_end_key {
                          value = $wr_end_digits|first_notnull:"0"|to_int
                        }

                        conditional {
                          if ($wr_name != "") {
                            array.push $work_rows {
                              value = {name: $wr_name, start: $wr_start, end: $wr_end, start_key: $wr_start_key, end_key: $wr_end_key, is_current: $wr_current, is_intern: $wr_intern}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            var $exp_months {
              value = -1
            }

            conditional {
              if ($exp_min_start > 0 && $exp_max_end >= $exp_min_start) {
                var.update $exp_months {
                  value = $exp_max_end - $exp_min_start
                }
              }
            }

            // More than 5 years of experience: internships are dropped
            var $drop_internships {
              value = $exp_months > 60
            }

            var $bullets_current {
              value = $prefs|get:"bullets_current":5
            }

            var $bullets_former {
              value = $prefs|get:"bullets_former":3
            }

            var $bullets_internship {
              value = $prefs|get:"bullets_internship":2
            }

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

                // Index among KEPT entries; the first kept entry is the current / most recent one
                var $kept_idx {
                  value = 0
                }

                foreach ($src_jobs) {
                  each as $job {
                    var $job_clean {
                      value = $job
                    }

                    var $job_skip {
                      value = false
                    }

                    conditional {
                      if ($job|is_object) {
                        // Match against the work_experience table BEFORE any field is removed.
                        // $job_db_range stays null when there is no match (AI date_range is kept).
                        var $job_db_range {
                          value = null
                        }

                        var $job_company {
                          value = $job|get:"company":null|first_notnull:""|to_text|trim|to_lower
                        }

                        conditional {
                          if ($prefs.work_date == true && $job_company != "" && ($work_rows|count) > 0) {
                            var $wm_found {
                              value = false
                            }

                            var $wm_current {
                              value = false
                            }

                            var $wm_start {
                              value = ""
                            }

                            var $wm_start_key {
                              value = 0
                            }

                            var $wm_end {
                              value = ""
                            }

                            var $wm_end_key {
                              value = 0
                            }

                            foreach ($work_rows) {
                              each as $wrow {
                                var $wrow_name {
                                  value = $wrow|get:"name":""
                                }

                                var $wrow_same {
                                  value = $wrow_name == $job_company || ($wrow_name|contains:$job_company) || ($job_company|contains:$wrow_name)
                                }

                                conditional {
                                  if ($wrow_same) {
                                    var.update $wm_found {
                                      value = true
                                    }

                                    conditional {
                                      if (($wrow|get:"is_current":false) == true) {
                                        var.update $wm_current {
                                          value = true
                                        }
                                      }
                                    }

                                    var $wrow_start {
                                      value = $wrow|get:"start":""
                                    }

                                    var $wrow_start_key {
                                      value = $wrow|get:"start_key":0
                                    }

                                    conditional {
                                      if ($wrow_start != "" && ($wm_start == "" || $wrow_start_key < $wm_start_key)) {
                                        var.update $wm_start {
                                          value = $wrow_start
                                        }

                                        var.update $wm_start_key {
                                          value = $wrow_start_key
                                        }
                                      }
                                    }

                                    var $wrow_end {
                                      value = $wrow|get:"end":""
                                    }

                                    var $wrow_end_key {
                                      value = $wrow|get:"end_key":0
                                    }

                                    conditional {
                                      if ($wrow_end != "" && ($wm_end == "" || $wrow_end_key > $wm_end_key)) {
                                        var.update $wm_end {
                                          value = $wrow_end
                                        }

                                        var.update $wm_end_key {
                                          value = $wrow_end_key
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }

                            conditional {
                              if ($wm_found) {
                                function.run "resume/format_month_year" {
                                  input = {value: $wm_start}
                                } as $wm_start_fmt

                                var $wm_end_label {
                                  value = "Present"
                                }

                                conditional {
                                  if (!$wm_current) {
                                    function.run "resume/format_month_year" {
                                      input = {value: $wm_end}
                                    } as $wm_end_fmt

                                    var.update $wm_end_label {
                                      value = $wm_end_fmt|first_notnull:""
                                    }
                                  }
                                }

                                var $wm_start_label {
                                  value = $wm_start_fmt|first_notnull:""
                                }

                                conditional {
                                  if ($wm_start_label != "" && $wm_end_label != "") {
                                    var.update $job_db_range {
                                      value = $wm_start_label ~ " - " ~ $wm_end_label
                                    }
                                  }

                                  elseif ($wm_start_label != "") {
                                    var.update $job_db_range {
                                      value = $wm_start_label
                                    }
                                  }

                                  elseif ($wm_end_label != "") {
                                    var.update $job_db_range {
                                      value = $wm_end_label
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }

                        // Internship test: entry title / job_title, or a matched work_experience row
                        var $job_title_raw {
                          value = $job|get:"title":null|first_notnull:""|to_text
                        }

                        var $job_title_alt {
                          value = $job|get:"job_title":null|first_notnull:""|to_text
                        }

                        var $job_title_intern {
                          value = "/\\bintern(ship)?\\b/i"|regex_matches:$job_title_raw
                        }

                        var $job_alt_intern {
                          value = "/\\bintern(ship)?\\b/i"|regex_matches:$job_title_alt
                        }

                        var $job_is_intern {
                          value = $job_title_intern || $job_alt_intern
                        }

                        // Row match counts as internship only when every matched row is an internship
                        // (an intern -> full-time path at the same company is consolidated and kept)
                        var $intern_rows {
                          value = 0
                        }

                        var $non_intern_rows {
                          value = 0
                        }

                        conditional {
                          if (!$job_is_intern && $job_company != "") {
                            foreach ($work_rows) {
                              each as $irow {
                                var $irow_name {
                                  value = $irow|get:"name":""
                                }

                                var $irow_same {
                                  value = $irow_name == $job_company || ($irow_name|contains:$job_company) || ($job_company|contains:$irow_name)
                                }

                                conditional {
                                  if ($irow_same && ($irow|get:"is_intern":false) == true) {
                                    var.update $intern_rows {
                                      value = $intern_rows + 1
                                    }
                                  }

                                  elseif ($irow_same) {
                                    var.update $non_intern_rows {
                                      value = $non_intern_rows + 1
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }

                        conditional {
                          if ($intern_rows > 0 && $non_intern_rows == 0) {
                            var.update $job_is_intern {
                              value = true
                            }
                          }
                        }

                        conditional {
                          if ($drop_internships && $job_is_intern) {
                            var.update $job_skip {
                              value = true
                            }
                          }

                          else {
                            // Bullet trimming: first kept entry = current, internships = internship, else former
                            var $bullet_limit {
                              value = $bullets_former
                            }

                            conditional {
                              if ($job_is_intern) {
                                var.update $bullet_limit {
                                  value = $bullets_internship
                                }
                              }

                              elseif ($kept_idx == 0) {
                                var.update $bullet_limit {
                                  value = $bullets_current
                                }
                              }
                            }

                            var $job_bullets {
                              value = $job_clean|get:"bullets":null
                            }

                            conditional {
                              if ($job_bullets != null && ($job_bullets|is_array) && ($job_bullets|count) > $bullet_limit) {
                                var.update $job_clean {
                                  value = $job_clean|set:"bullets":($job_bullets|slice:0:$bullet_limit)
                                }
                              }
                            }

                            var $job_highlights {
                              value = $job_clean|get:"highlights":null
                            }

                            conditional {
                              if ($job_highlights != null && ($job_highlights|is_array) && ($job_highlights|count) > $bullet_limit) {
                                var.update $job_clean {
                                  value = $job_clean|set:"highlights":($job_highlights|slice:0:$bullet_limit)
                                }
                              }
                            }
                          }
                        }

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

                          elseif ($job_db_range != null) {
                            // DB dates win: "Present" only when a matched row is_current
                            var.update $job_clean {
                              value = $job_clean|set:"date_range":$job_db_range|unset:"start"|unset:"end"
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

                    conditional {
                      if (!$job_skip) {
                        array.push $clean_jobs {
                          value = $job_clean
                        }

                        var.update $kept_idx {
                          value = $kept_idx + 1
                        }
                      }
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
