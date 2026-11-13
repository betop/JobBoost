// Regenerate resume and cover letter using the stored job description from an existing log
// v2: omit content_id from db.add to avoid empty-string UUID error
query "resume/regenerate" verb=POST {
  api_group = "resume"
  auth = "users"

  input {
    text ai_model?
    uuid log_id?
    bool force_generate?
  }

  stack {
    // Model picked in the extension (Haiku 4.5 default; 5.5 cheaper); validated against the selectable list
    function.run "ai/resolve_model" {
      input = {ai_model: null}
    } as $ai_model_id

    precondition ($input.log_id != null) {
      error_type = "badrequest"
      error = "log_id is required"
    }
  
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Generation log not found"
    }
  
    db.get profile {
      field_name = "id"
      field_value = $log.profile_id
    } as $prof

    // The model is a PER-PROFILE setting (admin panel -> profile); unknown/empty -> Haiku 4.5
    function.run "ai/resolve_model" {
      input = {ai_model: $prof.ai_model}
    } as $profile_model

    var.update $ai_model_id {
      value = $profile_model
    }
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    precondition ($prof.is_approved) {
      error_type = "accessdenied"
      error = "Profile is not approved. Please contact your admin."
    }

    // Pay-as-you-go credit check — super_admins are exempt; bidders are billed
    // through the profile's billing admin (falls back to the creating admin)
    function.run "credits/check_sufficient_balance" {
      input = {user_id: $auth.id, profile_id: $log.profile_id, allow_free_trial: true}
    } as $billing_check
  
    precondition (!$billing_check.is_billable || $billing_check.has_sufficient_balance) {
      error_type = "accessdenied"
      error = "Insufficient credit. The billing admin's credit balance is empty, please top up to continue."
    }

    var $credit_warning {
      value = null
    }

    conditional {
      if ($billing_check.low_balance) {
        var.update $credit_warning {
          value = {message: $billing_check.warning_message, balance: $billing_check.balance}
        }
      }
    }

    // Free trial (new admin accounts): null when not in trial, else remaining count after this request
    var $free_trial_info {
      value = null
    }

    conditional {
      if ($billing_check.free_trial) {
        function.run "credits/free_generation_allowance" {
          input = {}
        } as $free_allowance

        var.update $free_trial_info {
          value = {remaining: $billing_check.free_generations_remaining, total: $free_allowance}
        }
      }
    }
  
    // Usage object of the AI call (stays {} when the call throws before returning)
    var $main_usage {
      value = {}
    }

    var $input_tokens {
      value = 0
    }

    var $output_tokens {
      value = 0
    }

    var $cache_creation_input_tokens {
      value = 0
    }

    var $cache_read_input_tokens {
      value = 0
    }

    var $resume_content_id {
      value = null
    }
  
    var $resume_filename {
      value = ""
    }
  
    var $resume_text {
      value = ""
    }
  
    db.query work_experience {
      where = $db.work_experience.profile_id == $prof.id
      sort = {work_experience.start_date: "desc"}
      return = {type: "list"}
    } as $work
  
    db.query certification {
      where = $db.certification.profile_id == $prof.id
      sort = {certification.created_at: "asc"}
      return = {type: "list"}
    } as $user_certs

    // Candidate-provided certifications, one per line (empty = the AI proposes them as before)
    var $cert_text {
      value = ""
    }

    foreach ($user_certs) {
      each as $uc {
        var.update $cert_text {
          value = $cert_text ~ "- " ~ ($uc.name|first_notnull:"") ~ " | " ~ ($uc.issuer|first_notnull:"") ~ " | " ~ ($uc.issued_date|first_notnull:"") ~ " | " ~ ($uc.url|first_notnull:"") ~ "\n"
        }
      }
    }

    var $cert_block {
      value = ""
    }

    conditional {
      if (($user_certs|count) > 0) {
        var.update $cert_block {
          value = "\nCERTIFICATIONS (candidate-provided, use exactly these):\n" ~ $cert_text
        }
      }
    }

    db.query education {
      where = $db.education.profile_id == $prof.id
      sort = {education.start_date: "asc"}
      return = {type: "list"}
    } as $education
  
    // DISABLED — system prompt moved to a hardcoded value below. Kept for rollback reference.
    // db.query rule {
    //   where = $db.rule.is_active == true
    //   sort = {rule.created_at: "asc"}
    //   return = {type: "list"}
    // } as $rules
  
    // Resume section / item visibility and bullet counts (profile.resume_sections, legacy include_* folded in)
    function.run "resume/resolve_section_preferences" {
      input = {profile: $prof}
    } as $section_prefs

    // Total experience span: earliest start_date -> latest end (today for current / open-ended rows).
    // Month arithmetic on the "YYYY-MM-DD" date text; $exp_months stays -1 when unknown.
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

    foreach ($work) {
      each as $ew {
        var $ew_start {
          value = $ew|get:"start_date":null|first_notnull:""|to_text|trim
        }

        var $ew_end {
          value = $ew|get:"end_date":null|first_notnull:""|to_text|trim
        }

        var $ew_has_start {
          value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$ew_start
        }

        var $ew_has_end {
          value = "/^[0-9]{4}-[0-9]{2}/"|regex_matches:$ew_end
        }

        conditional {
          if ($ew_has_start) {
            var $ew_start_year {
              value = $ew_start|substr:0:4|to_int
            }

            var $ew_start_month {
              value = $ew_start|substr:5:2|to_int
            }

            var $ew_start_m {
              value = ($ew_start_year * 12) + $ew_start_month
            }

            conditional {
              if ($exp_min_start == 0 || $ew_start_m < $exp_min_start) {
                var.update $exp_min_start {
                  value = $ew_start_m
                }
              }
            }
          }
        }

        var $ew_end_m {
          value = $exp_today_months
        }

        conditional {
          if (($ew|get:"is_current":false) != true && $ew_has_end) {
            var $ew_end_year {
              value = $ew_end|substr:0:4|to_int
            }

            var $ew_end_month {
              value = $ew_end|substr:5:2|to_int
            }

            var.update $ew_end_m {
              value = ($ew_end_year * 12) + $ew_end_month
            }
          }
        }

        conditional {
          if ($ew_end_m > $exp_max_end) {
            var.update $exp_max_end {
              value = $ew_end_m
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

    var $total_experience_years {
      value = ($exp_months|to_decimal) / 12
    }

    // Internships are only included for candidates with 5 years of experience or less (unknown = include)
    var $include_internships {
      value = $exp_months <= 60
    }

    // Rows sent to the AI (internships dropped when excluded); the FULL $work list is still
    // passed to resume/apply_section_preferences.
    var $work_for_prompt {
      value = []
    }

    foreach ($work) {
      each as $wf {
        var $wf_title {
          value = $wf|get:"job_title":null|first_notnull:""|to_text
        }

        var $wf_type {
          value = $wf|get:"employment_type":null|first_notnull:""|to_text
        }

        var $wf_title_intern {
          value = "/\\bintern(ship)?\\b/i"|regex_matches:$wf_title
        }

        var $wf_type_intern {
          value = "/\\bintern(ship)?\\b/i"|regex_matches:$wf_type
        }

        conditional {
          if ($include_internships || (!$wf_title_intern && !$wf_type_intern)) {
            array.push $work_for_prompt {
              value = $wf
            }
          }
        }
      }
    }

    // Build work experience text
    var $work_text {
      value = ""
    }
  
    foreach ($work_for_prompt) {
      each as $w {
        // Dates go to the AI as "Mon YYYY" (never raw ISO with a day)
        function.run "resume/format_month_year" {
          input = {value: ($w.end_date|to_text|first_notnull:"")}
        } as $work_end_fmt

        function.run "resume/format_month_year" {
          input = {value: ($w.start_date|to_text|first_notnull:"")}
        } as $work_start_fmt

        var $end_label {
          value = $work_end_fmt|first_notnull:""
        }
      
        conditional {
          if ($w.is_current) {
            var.update $end_label {
              value = "Present"
            }
          }
        }
      
        var $location_display {
          value = $w.location
        }
      
        // Extract promotion note from job title (text within parentheses)
        var $promotion_note_display {
          value = ""
        }
      
        var $title_display {
          value = $w.job_title
        }
      
        var $paren_parts {
          value = $w.job_title|split:"("
        }
      
        conditional {
          if (($paren_parts|count) > 1) {
            var $closing_parts {
              value = ($paren_parts|last)|split:")"
            }
          
            var.update $promotion_note_display {
              value = $closing_parts|first
            }
          
            var.update $title_display {
              value = ($paren_parts|first)|trim
            }
          }
        }
      
        var.update $work_text {
          value = $work_text ~ ($title_display|first_notnull:"") ~ " | " ~ ($w.company_name|first_notnull:"") ~ " | " ~ ($location_display|first_notnull:"") ~ " | " ~ ($work_start_fmt|first_notnull:"") ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
        }
      }
    }
  
    // Build education text
    var $edu_text {
      value = ""
    }
  
    foreach ($education) {
      each as $e {
        function.run "resume/format_month_year" {
          input = {value: ($e.end_date|to_text|first_notnull:"")}
        } as $edu_date_fmt

        var $edu_line {
          value = ($e.degree_title|first_notnull:"") ~ " in " ~ ($e.field_of_study|first_notnull:"") ~ " from " ~ ($e.university_name|first_notnull:"")
        }

        var.update $edu_line {
          value = $edu_line ~ " (" ~ ($edu_date_fmt|first_notnull:"") ~ ")"
        }

        var $edu_row_location {
          value = $e.location|first_notnull:""|trim
        }

        var $prof_location_text {
          value = $prof.location|first_notnull:""|trim
        }

        // Education location only when both the row and the profile have one (never guessed)
        conditional {
          if ($edu_row_location != "" && $prof_location_text != "") {
            var.update $edu_line {
              value = $edu_line ~ " | Location: " ~ $edu_row_location
            }
          }
        }

        var.update $edu_text {
          value = $edu_text ~ $edu_line ~ "\n"
        }
      }
    }
  
    //  DISABLED — was: build system prompt from active rules in DB. Kept for rollback reference.
    //  var $system_prompt {
    //    value = ""
    //  }
    // 
    //  foreach ($rules) {
    //    each as $r {
    //      var.update $system_prompt {
    //        value = $system_prompt ~ $r.sentence ~ "\n"
    //      }
    //    }
    //  }
  
    // System prompt hardcoded directly in the backend (moved off the DB `rule` table).
    var $system_prompt {
      value = """
You write a tailored resume, as one JSON object, from the candidate profile and job description in the user message. Return only that JSON object: no markdown, no commentary, no text before or after it.

SECTIONS
Use the sections and exact key names of the JSON structure in the user message (including leadership_enterpreneurial_experience). Leave a section out only when the user message says to.

TAILORING
Tailor the whole resume to the job description, using only the candidate's real experience.
- technical_skills lists the job description's tools, languages, platforms and methods that the candidate has actually used, broad enough to cover what a recruiter or ATS scan for this role looks for.
- Bullets, projects and leadership entries favor work relevant to the job. The current or most relevant position covers most of the job's listed responsibilities, restated in the candidate's own words.
- Reflect the required qualifications wherever the candidate's experience supports them; preferred ones are optional.
- __TITLE_TAILORING_RULE__
- Never invent skills, experience, titles, honors, coursework or metrics the profile does not support.
- Paraphrase the job description instead of copying its wording (tool and technology names are exempt). Never use the words "leverage", "harden" or "hardening", or the phrase "own it end to end", anywhere in the output, including the cover letter.

COMPANY CONTEXT
For a company you recognize, ground its bullets, projects and leadership entries in what that company actually does (a healthcare booking company: patients, providers, appointments, insurance; a bank: accounts, compliance; a retailer: commerce, inventory, customers), so the work could not describe just any company. Technologies stay accurate to what the candidate used. For a company you don't recognize, don't guess an industry.

WORK EXPERIENCE (career_breakdowns)
Each WORK EXPERIENCE line in the profile is "title | company | location | date range | promotion note".
- Merge roles at the same company into one entry: the title of the most recent role there, and a date range from the first start to the final end. __INTERNSHIP_RULE__
- location is copied exactly from the line, even when it is empty or misspelled.
- date_range is "Mon YYYY - Mon YYYY" (e.g. "Aug 2015 - Apr 2017"), or "Mon YYYY - Present" only when the profile line says Present.
- Bullet counts: the current or most recent position has exactly __BULLETS_CURRENT__ bullets (unless it is an internship), every other non-internship position exactly __BULLETS_FORMER__, and every internship exactly __BULLETS_INTERNSHIP__. These counts override the length of the example arrays.

BULLETS
Each bullet is [specific action verb] + [the process, tool or method used] + [a concrete result], e.g. "Developed tracking systems for the Green District project, cutting staff allocation time by 30% and expenses by $125,000."
- Every bullet, internships included, has a specific metric (money, time, percentage, or volume such as users, requests or records) that is plausible for the role, company size and seniority. Vary the metric type across bullets. No absolute claims such as "zero data loss", "100% uptime", "no incidents" or "no downtime".
- Every bullet names at least one programming language, framework, cloud service, database or platform, describes engineering work, and uses the job description's keywords where the experience supports them.
- Within a position, don't repeat an opening verb or a sentence template. Avoid weak openers ("helped", "worked on", "was responsible for") and the same generic verb on every bullet.
- Match verbs to seniority: Intern or Junior roles don't "led", "architected", "owned", "directed" or "managed"; Senior, Lead or Staff roles don't "assisted" or "helped".
- Each accomplishment appears once in the whole resume, with one consistent set of numbers.

EDUCATION
Most recent first. highlights holds honors or activities from the profile and Relevant holds coursework relevant to the target role; neither is invented.

CERTIFICATIONS
1 to 3 entries, each with name and issuer only (no date, year or url). Use certifications the job description names, or well-known real certifications for its technologies or domain (e.g. AWS Certified Solutions Architect, Google Professional Data Engineer, CompTIA Security+), from real issuers and plausible for the candidate's seniority and timeline.

PORTFOLIO PROJECTS (at most 4) AND LEADERSHIP / ENTREPRENEURIAL EXPERIENCE (at most 3)
Each entry extends real work the candidate did at one of their employers, fits that employer's business and period, and has no date, year or company field. It must not repeat a career_breakdowns accomplishment, reuse a number from that company's bullets, or open with a verb already used to open one of them.
- A project is one core idea (e.g. letting doctors search patient records in plain language). name is "[Project name] ([technologies])"; description follows the bullet formula.
- A leadership entry opens with a specific action verb and stresses responsibilities and measurable results consistent with the rest of the resume. Its role label never claims more seniority than the candidate's real title at that company: for an individual-contributor title, describe the initiative rather than a "Lead" or "Senior" role.

FORMATTING
No bold (** markers) and no em dashes anywhere. Today's year is 2026.
"""
    }

    conditional {
      if (($user_certs|count) > 0) {
        var.update $system_prompt {
          value = $system_prompt ~ "\n\n========================================================\nCANDIDATE CERTIFICATIONS OVERRIDE\n========================================================\n\nThe candidate has provided their own certifications (CERTIFICATIONS in the candidate profile). This OVERRIDES the CERTIFICATIONS RULE above: the certifications section MUST contain exactly the candidate-provided certifications, in the same order, with their name and issuer exactly as entered. The server overwrites the certifications section (name, issuer, date as Mon YYYY or YYYY, url) from the candidate's records after you respond, so you may list them with name and issuer only. Do NOT add, invent, or replace them with other certifications, and never include a day in any date."
        }
      }
    }
  
    // Per-profile opt-out: substitute the title-tailoring rule text based on
    // $prof.tailor_job_title (default true). When disabled, the header title and
    // career_breakdowns titles MUST stay exactly as written in the candidate profile.
    var $tailor_job_title_flag {
      value = ($prof.tailor_job_title|json_encode) != "false"
    }
  
    var $title_tailoring_rule_text {
      value = "The header title and the current (and, where the underlying work genuinely supports it, former) position title(s) in career_breakdowns MAY be reworded to align with the terminology of the target role/job description (e.g. \"Software Engineer\" -> \"Backend Software Engineer\" for a backend-focused JD), but MUST NOT claim a higher seniority level (e.g. Junior -> Senior) or a title/role the candidate did not actually hold."
    }
  
    var $title_tailoring_validation_text {
      value = "Header title and current position title reflect the target role's terminology without inflating seniority."
    }
  
    conditional {
      if (!$tailor_job_title_flag) {
        var.update $title_tailoring_rule_text {
          value = "The header title and EVERY position title in career_breakdowns MUST be used EXACTLY as written in the candidate profile; do NOT reword, retitle, or align them to the job description's terminology in any way, even if the wording differs from the target role."
        }
      
        var.update $title_tailoring_validation_text {
          value = "Header title and every career_breakdowns position title match the candidate profile exactly, with no rewording toward the job description's terminology."
        }
      }
    }
  
    // Per-profile bullet counts and internship inclusion (from $section_prefs / $include_internships)
    var $bullets_current_text {
      value = $section_prefs|get:"bullets_current":5|to_text
    }

    var $bullets_former_text {
      value = $section_prefs|get:"bullets_former":3|to_text
    }

    var $bullets_internship_text {
      value = $section_prefs|get:"bullets_internship":2|to_text
    }

    var $internship_rule_text {
      value = "Do NOT include any internship positions."
    }

    conditional {
      if ($include_internships) {
        var.update $internship_rule_text {
          value = "Internship positions listed in the candidate profile MUST be kept as their own career_breakdowns entries."
        }
      }
    }

    var.update $system_prompt {
      value = $system_prompt
        |replace:"__TITLE_TAILORING_RULE__":$title_tailoring_rule_text
        |replace:"__BULLETS_CURRENT__":$bullets_current_text
        |replace:"__BULLETS_FORMER__":$bullets_former_text
        |replace:"__BULLETS_INTERNSHIP__":$bullets_internship_text
        |replace:"__INTERNSHIP_RULE__":$internship_rule_text
        |replace:"__TITLE_TAILORING_VALIDATION__":$title_tailoring_validation_text
    }
  
    // Build resume schema object for JSON examples
    // Resume JSON schema example, hardcoded directly as a string (no Xano object construction).
    var $resume_schema {
      value = "{\"header\":{\"name\":\"[NAME IN CAPS]\",\"location\":\"[City, State]\",\"email\":\"[Gmail]\",\"phone\":\"[Phone #]\",\"linkedin\":{\"display\":\"in/[username]\",\"url\":\"https://www.linkedin.com/in/[username]\"}},\"career_breakdowns\":[{\"company\":\"[Current Company]\",\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]},{\"company\":\"[Former Company]\",\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]}],\"education\":[{\"institution\":\"[University]\",\"degree\":\"[DEGREE IN CAPS]\",\"location\":\"[City, State]\",\"year\":\"[Mon YYYY]\",\"major\":\"[Major]\",\"highlights\":\"[Accolades, extracurriculars]\",\"Relevant\":\"[Relevant coursework]\"}],\"certifications\":[{\"name\":\"[Cert Name]\",\"issuer\":\"[Issuer]\"}],\"portfolio_projects\":[{\"name\":\"[Project Name] ([Technologies])\",\"description\":\"[Action verb + process + result]\"}],\"leadership_enterpreneurial_experience\":[{\"name\":\"[Initiative Name]\",\"role\":\"[Role]\",\"description\":\"[Responsibilities and results]\"}],\"technical_skills\":{\"programming\":\"xxx, xxx\",\"softwares\":\"xxx, xxx\",\"statistics_and_ml\":\"xxx, xxx\",\"project_management\":\"xxx, xxx\"}}"
    }

    // $section_prefs is resolved earlier (before the work experience text / prompt substitution)

    var $include_key_projects_flag {
      value = ($section_prefs|get:"portfolio_projects":true) == true
    }

    var $include_certifications_flag {
      value = ($section_prefs|get:"certifications":true) == true
    }

    var $include_leadership_flag {
      value = ($section_prefs|get:"leadership":true) == true
    }

    var $include_technical_skills_flag {
      value = ($section_prefs|get:"technical_skills":true) == true
    }

    var $include_education_flag {
      value = ($section_prefs|get:"education":true) == true
    }

    var $include_work_experience_flag {
      value = ($section_prefs|get:"work_experience":true) == true
    }

    var $include_summary_flag {
      value = ($section_prefs|get:"summary":true) == true
    }

    var $include_headline_flag {
      value = ($section_prefs|get:"headline":true) == true
    }

    // Build omit instruction for the AI prompt
    var $omit_sections_list {
      value = []
    }

    conditional {
      if (!$include_key_projects_flag) {
        array.push $omit_sections_list {
          value = "portfolio_projects"
        }
      }
    }

    conditional {
      if (!$include_certifications_flag) {
        array.push $omit_sections_list {
          value = "certifications"
        }
      }
    }

    conditional {
      if (!$include_leadership_flag) {
        array.push $omit_sections_list {
          value = "leadership_enterpreneurial_experience"
        }
      }
    }

    conditional {
      if (!$include_technical_skills_flag) {
        array.push $omit_sections_list {
          value = "technical_skills"
        }
      }
    }

    conditional {
      if (!$include_education_flag) {
        array.push $omit_sections_list {
          value = "education"
        }
      }
    }

    conditional {
      if (!$include_work_experience_flag) {
        array.push $omit_sections_list {
          value = "career_breakdowns"
        }
      }
    }

    var $omit_instruction {
      value = ""
    }

    conditional {
      if (($omit_sections_list|count) > 0) {
        var.update $omit_instruction {
          value = "\n\nIMPORTANT: Do NOT include these sections in the resume JSON: " ~ ($omit_sections_list|join:", ") ~ ". Leave them out entirely."
        }
      }
    }

    // Only the enabled sections go into the JSON structure we send
    conditional {
      if (!$include_certifications_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"certifications\":[{\"name\":\"[Cert Name]\",\"issuer\":\"[Issuer]\"}]":""
        }
      }
    }

    conditional {
      if (!$include_key_projects_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"portfolio_projects\":[{\"name\":\"[Project Name] ([Technologies])\",\"description\":\"[Action verb + process + result]\"}]":""
        }
      }
    }

    conditional {
      if (!$include_leadership_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"leadership_enterpreneurial_experience\":[{\"name\":\"[Initiative Name]\",\"role\":\"[Role]\",\"description\":\"[Responsibilities and results]\"}]":""
        }
      }
    }

    conditional {
      if (!$include_technical_skills_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"technical_skills\":{\"programming\":\"xxx, xxx\",\"softwares\":\"xxx, xxx\",\"statistics_and_ml\":\"xxx, xxx\",\"project_management\":\"xxx, xxx\"}":""
        }
      }
    }

    conditional {
      if (!$include_education_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"education\":[{\"institution\":\"[University]\",\"degree\":\"[DEGREE IN CAPS]\",\"location\":\"[City, State]\",\"year\":\"[Mon YYYY]\",\"major\":\"[Major]\",\"highlights\":\"[Accolades, extracurriculars]\",\"Relevant\":\"[Relevant coursework]\"}]":""
        }
      }
    }

    conditional {
      if (!$include_work_experience_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:",\"career_breakdowns\":[{\"company\":\"[Current Company]\",\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]},{\"company\":\"[Former Company]\",\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]}]":""
        }
      }
    }

    // Summary goes right after the header object (inserted before the headline so the anchor still matches)
    conditional {
      if ($include_summary_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:"[username]\"}}":"[username]\"}},\"summary\":\"[2-3 sentence professional summary tailored to the job description]\""
        }
      }
    }

    // Headline: professional title inside the header object
    conditional {
      if ($include_headline_flag) {
        var.update $resume_schema {
          value = $resume_schema|replace:"https://www.linkedin.com/in/[username]\"}}":"https://www.linkedin.com/in/[username]\"},\"title\":\"[Professional Title]\"}"
        }
      }
    }

    // Schema example bullet arrays follow the configured counts (the model copies the example length)
    var $bullet_placeholder {
      value = "\"[Action verb + process + result, metric]\""
    }

    var $bullets_current_n {
      value = $bullets_current_text|to_int
    }

    var $bullets_former_n {
      value = $bullets_former_text|to_int
    }

    var $bullets_current_items {
      value = []
    }

    for ($bullets_current_n) {
      each as $bci {
        var.update $bullets_current_items {
          value = $bullets_current_items|push:$bullet_placeholder
        }
      }
    }

    var $bullets_former_items {
      value = []
    }

    for ($bullets_former_n) {
      each as $bfi {
        var.update $bullets_former_items {
          value = $bullets_former_items|push:$bullet_placeholder
        }
      }
    }

    var $bullets_current_joined {
      value = $bullets_current_items|join:","
    }

    var $bullets_former_joined {
      value = $bullets_former_items|join:","
    }

    var $schema_current_bullets_old {
      value = "\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]"
    }

    var $schema_current_bullets_new {
      value = "\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[" ~ $bullets_current_joined ~ "]"
    }

    var $schema_former_bullets_old {
      value = "\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]"
    }

    var $schema_former_bullets_new {
      value = "\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[" ~ $bullets_former_joined ~ "]"
    }

    var.update $resume_schema {
      value = $resume_schema|replace:$schema_current_bullets_old:$schema_current_bullets_new
    }

    var.update $resume_schema {
      value = $resume_schema|replace:$schema_former_bullets_old:$schema_former_bullets_new
    }

    // Section / format rules (spoken languages, date format, education location, summary)
    var $section_rules_text {
      value = "\n\n========================================================\nSECTION AND FORMAT RULES (OVERRIDE)\n========================================================\n\n- technical_skills MUST NOT contain spoken/human languages (e.g. English, Spanish, French). Programming languages belong under programming.\n- Every date anywhere in the resume MUST be 'Mon YYYY' (e.g. Jun 2025) or 'Present'. Never include a day and never use numeric formats like 01-01-2025.\n- Education location MUST be copied from the candidate profile EDUCATION line; if none is given there, leave location empty. Never guess a university's city."
    }

    conditional {
      if ($include_summary_flag) {
        var.update $section_rules_text {
          value = $section_rules_text ~ "\n- summary: 2-3 sentences, maximum 60 words, no first person (no I, me, my), no em dashes, tailored to the job description using only the candidate's real experience."
        }
      }
    }

    var.update $system_prompt {
      value = $system_prompt ~ $section_rules_text
    }
  
    var $claude_auth {
      value = "x-api-key: " ~ $env.ANTHROPIC_API_KEY
    }
  
    var $response_text {
      value = ""
    }
  
    var $match_status {
      value = 0
    }
  
    var $error_msg {
      value = ""
    }

    // Structured-output JSON schema (output_config.format). This endpoint asks for the bare resume
    // object ($resume_schema, no {resume: ...} wrapper, no cover letter), so use the resume sub-schema.
    function.run "resume/output_schema" {
      input = {
        include_cover_letter: false
        summary             : $include_summary_flag
        headline            : $include_headline_flag
        work_experience     : $include_work_experience_flag
        education           : $include_education_flag
        certifications      : $include_certifications_flag
        portfolio_projects  : $include_key_projects_flag
        leadership          : $include_leadership_flag
        technical_skills    : $include_technical_skills_flag
      }
    } as $full_output_schema

    var $full_output_schema_props {
      value = $full_output_schema|get:"properties":{}
    }

    var $output_schema {
      value = $full_output_schema_props|get:"resume":null
    }

    // Future (effort / Claude Sonnet 5.5; tried and rolled back on 2026-11-13):
    // Sonnet 5.5 rejects thinking "disabled", and Haiku 5.5 rejects it above effort "high". To use effort,
    // replace the thinking line with an effort setting that is left out for Haiku 4.5 (it rejects effort):
    //   |set_conditional:"output_config":({}|set:"effort":"max"):($ai_model_id != "claude-haiku-4-5")
    // and raise max_tokens, since thinking counts toward it. At "max" with the current prompt,
    // Haiku 5.5 used all 32000 tokens thinking and returned no resume, so test lower effort first.
    try_catch {
      try {
        api.request {
          url = "https://api.anthropic.com/v1/messages"
          method = "POST"
          params = {}
            |set:"model":$ai_model_id
            |set:"thinking":({}|set:"type":"disabled")
            |set:"max_tokens":6000
            |set:"output_config":({}|set:"format":({}|set:"type":"json_schema"|set:"schema":$output_schema))
            |set:"system":([]
              |push:({}
                |set:"type":"text"
                |set:"text":$system_prompt
                |set:"cache_control":({}|set:"type":"ephemeral"|set:"ttl":"1h")
              )
            )
            |set:"messages":([]
              |push:({}
                |set:"role":"user"
                |set:"content":([]
                  |push:({}
                    |set:"type":"text"
                    |set:"text":"Generate a full tailored resume only.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ $cert_block ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ $resume_schema ~ $omit_instruction
                    |set:"cache_control":({}|set:"type":"ephemeral"|set:"ttl":"1h")
                  )
                  |push:({}
                    |set:"type":"text"
                    |set:"text":"\nJOB DESCRIPTION:\n" ~ ($input.job_description|substr:0:12000) ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
                  )
                )
              )
            )
          headers = []
            |push:"Content-Type: application/json"
            |push:$claude_auth
            |push:"anthropic-version: 2023-06-01"
          timeout = 300
        } as $ai_resp

        // Capture usage immediately so it is billed even if parsing below throws
        var.update $main_usage {
          value = $ai_resp.response.result.usage|first_notnull:{}
        }

        // Why the reply ended (end_turn / max_tokens / refusal); used for the error message if parsing fails
        var $ai_result {
          value = $ai_resp.response.result|first_notnull:{}
        }

        var $stop_reason {
          value = $ai_result|get:"stop_reason":""
        }

        var.update $response_text {
          value = ($ai_resp.response.result.content|filter:($$.type == "text"))|first|get:"text"
        }
      
        // Save resume/cover letter content for reference
        db.add resume_content {
          enforce_hidden_fields = false
          data = {raw_response: $response_text}
        } as $content_record
      
        var.update $resume_content_id {
          value = $content_record.id
        }
      
        // ==================== END TOKEN ACCUMULATION ====================
      
        // Parse JSON response (robust cleanup for code-fences / wrappers)
        var $clean_response {
          value = $response_text
            |replace:"```json\n":""
            |replace:"```JSON\n":""
            |replace:"```\n":""
            |replace:"```":""
            |trim
        }
      
        // Try parsing JSON; if it fails, remove last character and retry
        var $parsed_response {
          value = null
        }
      
        try_catch {
          try {
            // First attempt: parse cleaned response as-is
            var.update $parsed_response {
              value = $clean_response|json_decode
            }
          }
        
          catch {
            // Second attempt: drop a stray ")" between a closing quote and ] } or , (e.g. ...rates.")]})
            var $paren_fixed_response {
              value = "/\"[)](?=[ \t\r\n]*[]},])/"|regex_replace:"\"":$clean_response
            }

            try_catch {
              try {
                var.update $parsed_response {
                  value = $paren_fixed_response|json_decode
                }
              }

              catch {
                // Third attempt: remove last character (common extra trailing brace issue)
                var $trimmed_response {
                  value = ("/.$/s"|regex_replace:"":$clean_response)|trim
                }

                try_catch {
                  try {
                    var.update $parsed_response {
                      value = $trimmed_response|json_decode
                    }
                  }

                  catch {
                    // Fourth attempt: append the missing final closing brace
                    var $brace_appended_response {
                      value = $clean_response ~ "}"
                    }

                    try_catch {
                      try {
                        var.update $parsed_response {
                          value = $brace_appended_response|json_decode
                        }
                      }

                      catch {
                        // JSON is truly invalid; $parsed_response stays null, handled below
                        debug.log {
                          value = "JSON parse failed after all repair attempts (stop_reason: " ~ $stop_reason ~ "): " ~ $error
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      
        // ==================== PARSE AI RESPONSE ====================
        // Status codes: 1=match, 0=mismatch, 2=unfit, 3=not_job_description, 6=ai_error
        // Only status=match gets resume/cover_letter content.
        // AI sometimes returns resume content even for non-match - we discard it server-side.
      
        conditional {
          if ($parsed_response == null) {
            // JSON parsing failed completely
            var.update $match_status {
              value = 6
            }
          
            var.update $error_msg {
              value = "AI processing error: received an invalid response. Please try again."
            }

            conditional {
              if ($stop_reason == "max_tokens") {
                var.update $error_msg {
                  value = "AI processing error: the response was cut off (too long). Please try again."
                }
              }

              elseif ($stop_reason == "refusal") {
                var.update $error_msg {
                  value = "AI processing error: the AI declined this job description. Please try again or use another job."
                }
              }
            }

            debug.log {
              value = "Resume JSON parse failed; stop_reason: " ~ $stop_reason
            }
          }
        
          else {
            var.update $match_status {
              value = 1
            }
          
            // Profile is the source of truth for header contact info (AI may omit/garble it)
            function.run "resume/apply_profile_header" {
              input = {resume: $parsed_response, profile: $prof}
            } as $resume_final

            // ==================== DATE / CERTIFICATION NORMALIZATION ====================
            // No resume date may include a day. Projects/leadership carry no dates at all.
            // Manual certifications (certification table) are owned by code: they replace whatever the AI returned.
            var $month_abbr {
              value = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            }

            var $resume_is_obj {
              value = $resume_final != null && ($resume_final|is_object)
            }

            conditional {
              if ($resume_is_obj) {
                // Portfolio projects: strip every date-like key (and company, used by the PDF date fallback)
                var $src_projects {
                  value = $resume_final|get:"portfolio_projects":null
                }

                conditional {
                  if ($src_projects != null && ($src_projects|is_array)) {
                    var $clean_projects {
                      value = []
                    }

                    foreach ($src_projects) {
                      each as $pp {
                        var $pp_clean {
                          value = $pp
                        }

                        conditional {
                          if ($pp|is_object) {
                            var.update $pp_clean {
                              value = $pp|unset:"date"|unset:"date_range"|unset:"start"|unset:"end"
                            }

                            var.update $pp_clean {
                              value = $pp_clean|unset:"year"|unset:"company"
                            }
                          }
                        }

                        array.push $clean_projects {
                          value = $pp_clean
                        }
                      }
                    }

                    var.update $resume_final {
                      value = $resume_final|set:"portfolio_projects":$clean_projects
                    }
                  }
                }

                // Leadership entries: strip every date-like key
                var $src_leadership {
                  value = $resume_final|get:"leadership_enterpreneurial_experience":null
                }

                conditional {
                  if ($src_leadership != null && ($src_leadership|is_array)) {
                    var $clean_leadership {
                      value = []
                    }

                    foreach ($src_leadership) {
                      each as $ld {
                        var $ld_clean {
                          value = $ld
                        }

                        conditional {
                          if ($ld|is_object) {
                            var.update $ld_clean {
                              value = $ld|unset:"date"|unset:"date_range"|unset:"start"|unset:"end"
                            }

                            var.update $ld_clean {
                              value = $ld_clean|unset:"year"
                            }
                          }
                        }

                        array.push $clean_leadership {
                          value = $ld_clean
                        }
                      }
                    }

                    var.update $resume_final {
                      value = $resume_final|set:"leadership_enterpreneurial_experience":$clean_leadership
                    }
                  }
                }

                // Certifications
                conditional {
                  if (($user_certs|count) > 0 && $include_certifications_flag) {
                    var $manual_certs {
                      value = []
                    }

                    foreach ($user_certs) {
                      each as $mc {
                        var $mc_raw_date {
                          value = $mc.issued_date|first_notnull:""|to_text|trim
                        }

                        var $mc_date {
                          value = $mc_raw_date
                        }

                        // "YYYY-MM" or "YYYY-MM-DD..." -> "Mon YYYY"
                        var $m_iso {
                          value = "/^(\\d{4})-(\\d{1,2})/"|regex_get_first_match:$mc_raw_date
                        }

                        // "Month DD, YYYY" -> "Mon YYYY"
                        var $m_named {
                          value = "/^([A-Za-z]{3})[A-Za-z]*\\.?\\s+\\d{1,2}(st|nd|rd|th)?,?\\s+(\\d{4})$/"|regex_get_first_match:$mc_raw_date
                        }

                        // "MM/DD/YYYY" -> "Mon YYYY"
                        var $m_slash {
                          value = "/^(\\d{1,2})[\\/.](\\d{1,2})[\\/.](\\d{4})$/"|regex_get_first_match:$mc_raw_date
                        }

                        conditional {
                          if (($m_iso|count) > 2) {
                            var $iso_month {
                              value = ($m_iso|get:2)|to_int
                            }

                            conditional {
                              if ($iso_month >= 1 && $iso_month <= 12) {
                                var.update $mc_date {
                                  value = ($month_abbr|get:($iso_month - 1)) ~ " " ~ ($m_iso|get:1)
                                }
                              }

                              else {
                                var.update $mc_date {
                                  value = $m_iso|get:1
                                }
                              }
                            }
                          }

                          elseif (($m_named|count) > 3) {
                            var $named_mon {
                              value = $m_named|get:1|to_lower|capitalize
                            }

                            var.update $mc_date {
                              value = $named_mon ~ " " ~ ($m_named|get:3)
                            }
                          }

                          elseif (($m_slash|count) > 3) {
                            var $slash_month {
                              value = ($m_slash|get:1)|to_int
                            }

                            conditional {
                              if ($slash_month >= 1 && $slash_month <= 12) {
                                var.update $mc_date {
                                  value = ($month_abbr|get:($slash_month - 1)) ~ " " ~ ($m_slash|get:3)
                                }
                              }

                              else {
                                var.update $mc_date {
                                  value = $m_slash|get:3
                                }
                              }
                            }
                          }
                        }

                        var $mc_url {
                          value = $mc.url|first_notnull:""|to_text|trim
                        }

                        conditional {
                          if ($mc_url != "" && !("/^https?:\\/\\//i"|regex_matches:$mc_url)) {
                            var.update $mc_url {
                              value = "https://" ~ $mc_url
                            }
                          }
                        }

                        var $mc_name {
                          value = $mc.name|first_notnull:""|to_text|trim
                        }

                        var $mc_issuer {
                          value = $mc.issuer|first_notnull:""|to_text|trim
                        }

                        array.push $manual_certs {
                          value = {}|set:"name":$mc_name|set:"issuer":$mc_issuer|set:"date":$mc_date|set:"url":$mc_url
                        }
                      }
                    }

                    var.update $resume_final {
                      value = $resume_final|set:"certifications":$manual_certs
                    }
                  }

                  elseif (($user_certs|count) == 0) {
                    // AI-proposed certifications: never dated
                    var $src_certs {
                      value = $resume_final|get:"certifications":null
                    }

                    conditional {
                      if ($src_certs != null && ($src_certs|is_array)) {
                        var $clean_certs {
                          value = []
                        }

                        foreach ($src_certs) {
                          each as $ac {
                            var $ac_clean {
                              value = $ac
                            }

                            conditional {
                              if ($ac|is_object) {
                                var.update $ac_clean {
                                  value = $ac|unset:"date"|unset:"date_range"|unset:"year"
                                }
                              }
                            }

                            array.push $clean_certs {
                              value = $ac_clean
                            }
                          }
                        }

                        var.update $resume_final {
                          value = $resume_final|set:"certifications":$clean_certs
                        }
                      }
                    }
                  }
                }
              }
            }
            // ==================== END DATE / CERTIFICATION NORMALIZATION ====================

            // Section / item visibility, date normalization, DB-only education location, spoken languages
            function.run "resume/apply_section_preferences" {
              input = {resume: $resume_final, profile: $prof, education_records: $education, work_records: $work, prefs: $section_prefs}
            } as $resume_final


            var.update $resume_text {
              value = $resume_final|json_encode
            }
          }
        }
      }
    
      catch {
        debug.log {
          value = "AI call failed: " ~ $error
        }
      
        var.update $match_status {
          value = 6
        }
      
        var.update $error_msg {
          value = "AI processing error: " ~ $error ~ ". Please try again."
        }
      }
    }
  
    var.update $resume_filename {
      value = $prof.full_name ~ ".pdf"
    }
  
    var.update $input_tokens {
      value = $main_usage|get:"input_tokens"|first_notnull:0
    }

    var.update $output_tokens {
      value = $main_usage|get:"output_tokens"|first_notnull:0
    }

    var.update $cache_creation_input_tokens {
      value = $main_usage|get:"cache_creation_input_tokens"|first_notnull:0
    }

    var.update $cache_read_input_tokens {
      value = $main_usage|get:"cache_read_input_tokens"|first_notnull:0
    }

    // Usage rate in force right now: saved on the log row and used for the charge (log and ledger agree)
    function.run "credits/get_usage_rate" {
      input = {admin_id: $billing_check.billing_admin_id, model: $ai_model_id}
    } as $log_rate_info

    var $usage_rate {
      value = $log_rate_info.usage_rate
    }

    // Non-billable usage is logged with charged_amount 0; billable rows stay null until the charge patches them
    var $log_charged {
      value = 0
    }

    conditional {
      if ($billing_check.is_billable && !$billing_check.free_trial) {
        var.update $log_charged {
          value = null
        }
      }
    }

    db.add generation_log {
      enforce_hidden_fields = false
      data = {
        profile_id           : $log.profile_id
        user_id              : $auth.id
        job_url              : $log.job_url
        job_description      : $log.job_description
        input_tokens         : $input_tokens
        output_tokens        : $output_tokens
        cache_creation_input_tokens: $cache_creation_input_tokens
        cache_read_input_tokens     : $cache_read_input_tokens
        usage_rate: $usage_rate
        ai_model: $ai_model_id
        charged_amount: $log_charged
        resume_filename      : $resume_filename
        cover_letter_filename: ""
        position_title       : $log.position_title
        company_name         : $log.company_name
        is_regenerated       : 1
        is_matched           : $match_status
        match_reason         : $error_msg
        seniority            : $log.seniority
        tech_scope           : $log.tech_scope
        content_id           : $resume_content_id
      }
    } as $log

    // Charge the billing admin for this AI usage (1.5x raw provider cost)
    conditional {
      if ($billing_check.is_billable) {
        function.run "credits/credit_charge_usage" {
          input = {
            model                : $ai_model_id
            admin_id             : $billing_check.billing_admin_id
            usage_rate           : $usage_rate
            input_tokens         : $input_tokens
            output_tokens        : $output_tokens
            cache_creation_tokens: $cache_creation_input_tokens
            cache_read_tokens    : $cache_read_input_tokens
            profile_id           : $prof.id
            related_log_table    : "generation_log"
            related_log_id       : $log.id
            allow_negative       : true
            free_trial          : $billing_check.free_trial
          }
        } as $gen_charge

        // Free trial: only a successfully produced resume consumes one free generation
        conditional {
          if ($billing_check.free_trial && $match_status == 1) {
            function.run "credits/consume_free_generation" {
              input = {admin_id: $billing_check.billing_admin_id, model: $ai_model_id}
            } as $free_consumed

            var.update $free_trial_info {
              value = {remaining: $free_consumed.remaining, total: $free_allowance}
            }
          }
        }

        // Record the final billed amount on the log row; a failure here must not undo the charge
        try_catch {
          try {
            db.patch generation_log {
              field_name = "id"
              field_value = $log.id
              data = {charged_amount: $gen_charge.charged, billing_admin_id: $billing_check.billing_admin_id}
            } as $_log_patch
          }

          catch {
            debug.log {
              value = "generation_log charged_amount patch failed"
            }
          }
        }
      }
    }
  }

  response = {
    match_status   : $match_status
    error_msg      : $error_msg
    resume_text    : $resume_text
    resume_filename: $resume_filename
    credit_warning       : $credit_warning
    free_trial           : $free_trial_info
  }
  guid = "hAnQgUuQRN0X-UuBt8keYNolcJ8"
}