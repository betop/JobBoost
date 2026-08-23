// Regenerate resume and cover letter using the stored job description from an existing log
// v2: omit content_id from db.add to avoid empty-string UUID error
query "resume/regenerate" verb=POST {
  api_group = "resume"
  auth = "users"

  input {
    uuid log_id?
    bool force_generate?
  }

  stack {
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
  
    precondition ($prof != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    precondition ($prof.is_approved) {
      error_type = "accessdenied"
      error = "Profile is not approved. Please contact your admin."
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
  
    // Build work experience text
    var $work_text {
      value = ""
    }
  
    foreach ($work) {
      each as $w {
        var $end_label {
          value = $w.end_date|to_text|first_notnull:""
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
          value = $work_text ~ ($title_display|first_notnull:"") ~ " | " ~ ($w.company_name|first_notnull:"") ~ " | " ~ ($location_display|first_notnull:"") ~ " | " ~ ($w.start_date|to_text|first_notnull:"") ~ " - " ~ $end_label ~ " | " ~ $promotion_note_display ~ "\n"
        }
      }
    }
  
    // Build education text
    var $edu_text {
      value = ""
    }
  
    foreach ($education) {
      each as $e {
        var.update $edu_text {
          value = $edu_text ~ ($e.degree_title|first_notnull:"") ~ " in " ~ ($e.field_of_study|first_notnull:"") ~ " from " ~ ($e.university_name|first_notnull:"") ~ " (" ~ ($e.end_date|to_text|first_notnull:"") ~ ") "
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
You are a deterministic resume generation engine.

You MUST return EXACTLY ONE valid JSON object.
You MUST NOT output explanations.
You MUST NOT output markdown.
You MUST NOT output text outside JSON.
You MUST NOT output multiple JSON objects.

If ANY rule is violated, you MUST regenerate internally before returning output.

========================================================
GLOBAL STRUCTURE RULE
========================================================
        
The resume JSON object MUST contain ALL of the following sections:

- header
- career_breakdowns
- education
- certifications
- portfolio_projects
- leadership_enterpreneurial_experience
- technical_skills

If ANY section is missing, renamed, incomplete, or structurally altered, you MUST regenerate.

========================================================
GLOBAL FORMATTING RULE — NO BOLD
========================================================

CATEGORY_A = Programming languages, frameworks, cloud services, databases, platforms.

You MUST NOT use any bold formatting (** markers) anywhere in the resume — not in bullets, technical_skills, portfolio_projects, leadership_enterpreneurial_experience descriptions, metrics, numeric values, regulatory terms, or soft skills.

If any bold formatting is present anywhere in the resume, you MUST regenerate.

========================================================
GLOBAL TAILORING RULE — JOB DESCRIPTION
========================================================

The entire resume MUST be tailored to the provided job description.

1. technical_skills MUST prioritize the tools, languages, platforms, and methodologies that appear in the job description, drawn only from the candidate's real experience, and MUST be comprehensive enough to cover the range of keywords a recruiter or ATS scan would look for on this specific role.
2. Bullets, portfolio_projects, and leadership_enterpreneurial_experience entries MUST emphasize work relevant to the job description over unrelated work.
3. Bullets in the current or most relevant career_breakdowns entry MUST reflect most — not necessarily all — of the responsibilities listed in the job description's Responsibilities section, restated in the candidate's own words and grounded in their real experience. Do NOT copy job description language verbatim.
4. The resume MUST reflect most of the qualifications/requirements listed in the job description. Required qualifications MUST be reflected wherever the candidate's real experience supports them; preferred qualifications MAY be included but are not mandatory. Not every listed qualification needs to appear.
5. The header title and the current (and, where the underlying work genuinely supports it, former) position title(s) in career_breakdowns MAY be reworded to align with the terminology of the target role/job description (e.g. "Software Engineer" -> "Backend Software Engineer" for a backend-focused JD) — but MUST NOT claim a higher seniority level (e.g. Junior -> Senior) or a title/role the candidate did not actually hold.
6. Applies EVERYWHERE in the output including portfolio_projects, leadership_enterpreneurial_experience, and the cover letter: do NOT reuse distinctive job description verbs/phrases such as "leverage"/"high leverage", "harden"/"hardening", "own it end to end", or similarly specific wording. Paraphrase with different vocabulary. Tool and technology names (e.g. "AI development tools", "coding agents", "Elixir") are exempt — only stylistic/descriptive phrasing must be paraphrased. Before returning the JSON, scan the ENTIRE output text for the literal substrings "harden", "hardening", and "leverage" — if any are found, rewrite that sentence.
7. You MUST NOT invent skills or experience not evidenced by the candidate profile just to match the job description.

If the resume is not clearly tailored to the job description, you MUST regenerate.

========================================================
WORK EXPERIENCE — COMPANY CONSOLIDATION
========================================================

If multiple roles share the same company name:
1. If the internship was completed during your time at university, remove it from the career breakdown list.
2. There MUST NOT be duplicate company entries — all roles from the same company MUST be merged into ONE single career_breakdowns entry.
3. The Title MUST be the title of the most recent role held at that company.
4. The Period MUST cover the entire time at that company, from the first date joined to Present (if still employed) or the final departure date.
5. End date in the last company MUST always be "Present".

If consolidation fails, you MUST regenerate.

========================================================
WORK EXPERIENCE — COMPANY CONTEXT
========================================================

For any company you recognize as a real, identifiable company (not a generic/unknown name), ground the bullets, portfolio_projects entries, and leadership entries for that company in what it actually does — its real product, industry, or core business. Do NOT write purely generic, company-agnostic descriptions ("transaction processing," "multi-tenant SaaS infrastructure," "event-driven services") that could describe any company.

Example: for a healthcare appointment-booking company, bullets should reference patients, providers, appointments, insurance, or healthcare data — not generic "transactions." For a bank, reference financial/account/compliance context. For a retailer, reference commerce/inventory/customer context. Technologies stay accurate to what the candidate used, but the PURPOSE of the work MUST fit the company's real business.

This rule does not apply to companies you do not recognize — do not guess or invent an industry.

========================================================
WORK EXPERIENCE — LOCATION & DATE FORMAT
========================================================

Location:
Work experience entries are formatted as: position title | company name | work location | date range | promotion note.
Split on "|" and map to career_breakdowns.location = split_result[2].
You MUST NOT change this value even if it is empty or has a spelling issue — copy it exactly as written in the user prompt. If not, regenerate.

Date format:
career_breakdowns date_range MUST use abbreviated month name plus full year only.
Format: "Mon YYYY - Mon YYYY" or "Mon YYYY - Present" if still employed.
Example: "Aug 2015 - Apr 2017".
You MUST NOT use full month names, day numbers, or numeric month/date formats.

If either rule is violated, you MUST regenerate.

========================================================
WORK EXPERIENCE — TITLE INTEGRITY
========================================================

If role title contains "Intern" or "Junior":
- MUST NOT use verbs such as led, architected, owned, directed, managed.

If role title contains "Senior", "Lead", or "Staff":
- MUST NOT use verbs such as assisted, helped.

If verb usage does not align with seniority level, regenerate that bullet.

========================================================
WORK EXPERIENCE — BULLET RULE
========================================================

Each bullet MUST follow this exact three-part formula:
1. [Action verb] — a strong, specific verb from the ACTION VERB BANK below, chosen to match what the bullet actually describes — never weak phrasing like "helped," "worked on," "was responsible for," or "assisted with," and never a generic default like "Led" or "Managed" for every bullet.
2. [A process] — the specific approach, tool, or method actually used to do the work.
3. [A result] — a concrete, measurable outcome: money saved or earned, time saved, percentage improvement, or volume/scale (e.g. requests handled, users served, records processed, tickets resolved) relevant to the role.

Example: "Developed tracking systems for the Green District project [process], cutting staff allocation time by 30% and expenses by $125,000 [result]."

EVERY bullet, in every position — current and former, including internships — MUST include a specific, concrete metric grounded in the candidate's real experience. A bullet with no measurable result is incomplete and MUST be rewritten.

Each bullet MUST also:
- Contain at least one CATEGORY_A tool.
- Be directly relevant to one or more of the job description's key responsibilities, using the job description's own keywords and terminology wherever the candidate's real experience supports it — for ATS/recruiter keyword matching.
- Describe engineering implementation work.
- Use varied sentence structure and opening verbs — do NOT repeat the same "[verb] + [what], [metric] by/through [method]" pattern on every bullet within a position.

ACTION VERB BANK — pick the category matching what the bullet actually describes, then a specific verb from within it. Do NOT reuse the same verb more than once within a single position.
- Led a project start to finish: Administered, Arranged, Chaired, Coordinated, Directed, Executed, Delegated, Headed, Managed, Operated, Orchestrated, Organized, Oversaw, Planned, Produced, Programmed, Spearheaded
- Envisioned/built something from scratch: Built, Charted, Created, Designed, Developed, Devised, Founded, Engineered, Established, Formalized, Formed, Formulated, Implemented, Incorporated, Initiated, Instituted, Introduced, Launched, Pioneered, Proposed
- Increased efficiency/productivity/revenue/satisfaction (or reduced cost/time): Accelerated, Achieved, Advanced, Amplified, Boosted, Capitalized, Conserved, Consolidated, Decreased, Deducted, Delivered, Enhanced, Expanded, Expedited, Furthered, Gained, Generated, Improved, Increased, Lifted, Maximized, Outpaced, Reconciled, Reduced, Saved, Stimulated, Sustained, Yielded
- Changed or improved a system/process: Centralized, Clarified, Converted, Customized, Digitized, Integrated, Merged, Modernized, Modified, Overhauled, Redesigned, Refined, Refocused, Rehabilitated, Remodeled, Reorganized, Replaced, Restructured, Revamped, Revitalized, Simplified, Standardized, Streamlined, Strengthened, Transformed, Updated, Upgraded
- Managed/led a team: Aligned, Cultivated, Directed, Enabled, Facilitated, Fostered, Guided, Hired, Mentored, Mobilized, Motivated, Recruited, Shaped, Supervised, Taught, Trained, Unified, United
- Brought in partners/funding/clients: Acquired, Closed, Forged, Navigated, Negotiated, Partnered, Pitched, Secured, Signed, Sourced, Upsold
- Supported customers: Advised, Advocated, Coached, Consulted, Educated, Fielded, Informed, Recommended, Resolved
- Did research/analysis: Analyzed, Assembled, Assessed, Audited, Calculated, Compiled, Discovered, Evaluated, Examined, Explored, Forecasted, Identified, Interpreted, Interviewed, Investigated, Mapped, Measured, Modeled, Projected, Qualified, Quantified, Reported, Surveyed, Tested, Tracked, Visualized
- Communicated (wrote/spoke/presented): Authored, Briefed, Campaigned, Coauthored, Composed, Conveyed, Convinced, Corresponded, Counseled, Critiqued, Defined, Documented, Drafted, Edited, Illustrated, Lobbied, Outlined, Persuaded, Presented, Promoted, Publicized, Reviewed, Wrote
- Oversaw/regulated/enforced: Adjudicated, Authorized, Blocked, Dispatched, Enforced, Ensured, Inspected, Itemized, Monitored, Screened, Scrutinized, Verified
- Achieved a goal/result: Attained, Completed, Demonstrated, Finished, Earned, Exceeded, Outperformed, Overcame, Reached, Showcased, Succeeded, Surpassed, Targeted, Won

Metrics:
- MUST be specific and concrete — not vague words like "significantly" or "greatly".
- MUST be plausible for the role, company size, and seniority level — no "99.9% uptime" or "50% reduction" on a junior/mid-level IC role unless clearly justified.
- MUST NOT use absolute/unfalsifiable claims such as "zero data loss", "100% uptime", "no incidents", or "no downtime". Before returning the JSON, scan the ENTIRE output text for these phrases — if found, rewrite with measured language (e.g. "without a reported data-loss incident", "maintained high reliability").
- Vary the TYPE of metric across bullets (money, time, percentage, volume/scale) — not every bullet should use the same round-percentage format.
- Do NOT restate the same accomplishment in more than one place in the resume. This applies across career_breakdowns, portfolio_projects, and leadership_enterpreneurial_experience — each real accomplishment appears once with one consistent set of facts.

Bullet counts:
- The current/most recent position MUST have more bullets than every former position (5 bullets is a good target).
- EVERY former (non-current) position that is NOT an internship MUST have EXACTLY 3 bullets — uniformly, with no exceptions and no gradual reduction as positions get older.
- Internship positions MAY have fewer than 3 bullets.
- Before returning the JSON, go through career_breakdowns one entry at a time and count bullets. If any former non-internship entry has fewer than 3, add bullets until it has exactly 3.

If the three-part formula is not followed, a bullet lacks a metric, every bullet in a position shares the same sentence template, or ANY former non-internship position has fewer than 3 bullets, you MUST regenerate.

========================================================
EDUCATION RULE
========================================================

Entries MUST be ordered most recently attended first.
The highlights field MUST include accolades, honors, or extracurricular activities known from the candidate profile.
The Relevant field MUST include coursework relevant to the candidate's target position.
You MUST NOT fabricate accolades, honors, or coursework not evidenced by the candidate profile.

If order is incorrect, regenerate.

========================================================
CERTIFICATIONS RULE
========================================================

There MUST be between 1 and 3 certifications. This section MUST NOT be left empty.

Since the candidate profile does not include real certifications, generate plausible ones by choosing:
1. Certifications explicitly named in the job description, if consistent with the candidate's seniority and background, or otherwise
2. Well-known, real, industry-standard certifications closely related to the job description's technologies or domain that a professional at the candidate's seniority level would plausibly hold (e.g. AWS Certified Solutions Architect, Microsoft Certified: Azure Developer Associate, PMP, Certified ScrumMaster, CompTIA Security+, Google Professional Data Engineer).

Each certification MUST include name, issuer, and date.

You MUST:
- Use ONLY real, well-known certifying organizations (e.g. AWS, Microsoft, Google, PMI, Scrum Alliance, CompTIA, Cisco) — NOT fabricated ones.
- Use a plausible past date consistent with the candidate's career timeline.
- NOT invent obscure or fictional certifications or include numeric metrics.

========================================================
PORTFOLIO PROJECTS RULE
========================================================

There MUST be no more than 4 projects.

Each project:
- Must be derived from real work experience (profile career - company).
- Must be a core idea. (e.g. Doctors want to search specific patients data from database using query like "Show me patients data between Jan - Mar this year")
- Name MUST follow format: "[Name of Project] ([Technologies/Methodologies used])"
- Description MUST follow the same [Action verb] + [process] + [result] formula as the BULLET RULE above (including ACTION VERB BANK verb constraints and metric requirements). The opening verb MUST NOT be the same verb already used to open a career_breakdowns bullet for that same company. Apply BULLET RULE — Metrics (metric non-reuse) to this entry.
- You MUST NOT fabricate projects or metrics not evidenced by the candidate profile.

Before returning the JSON, for every number in a portfolio_projects entry, check all career_breakdowns bullets for that same company for the exact same number. If reused, remove or replace it with a different metric.

========================================================
LEADERSHIP / ENTREPRENEURIAL EXPERIENCE RULE
========================================================

There MUST be no more than 3 entries.

Each entry:
- Must derive from real work already reflected in career_breakdowns — a deeper, more specific extension of something the candidate actually did at a real employer, not a separate invented initiative.
- Description MUST open with a strong, specific verb from the ACTION VERB BANK in the BULLET RULE above. The opening verb MUST NOT be the same verb already used to open a career_breakdowns bullet for that same company. Apply BULLET RULE — Metrics (metric non-reuse) to this entry.
- The "role" label (e.g. Lead Engineer, Technical Lead, Project Lead) MUST NOT imply seniority or authority beyond what the candidate's actual job_title at that company supports. If the real title was an individual-contributor title (e.g. Software Engineer), frame it as a specific initiative or contribution — do NOT imply a formal leadership title they did not hold.
- Must emphasize responsibilities and measurable results, quantified ONLY where the work genuinely supports it. Metrics MUST be consistent with (not contradict) related numbers used elsewhere in the resume.
- You MUST NOT fabricate leadership roles, titles, scope of authority, or metrics not evidenced by the candidate's real profile.
- You MUST NOT duplicate an accomplishment already stated in career_breakdowns.

Before returning the JSON, for every number in a leadership entry, check all career_breakdowns bullets for that same company for the exact same number. If reused, remove or replace it.

Before returning the JSON, for every leadership entry compare its "role" label against the candidate's real job_title at that company. If the role label contains a seniority/authority word not present in the real title (e.g. "Senior", "Staff", "Principal", "Director", "Head of", "Lead"), remove it or rewrite to match the real title's seniority level.

========================================================
FINAL VALIDATION — ENTIRE RESUME
========================================================

Before returning JSON, you MUST verify:

- Resume is tailored to the job description (technical_skills, bullets, portfolio_projects, and leadership entries emphasize relevant work).
- No duplicate company entries. Company consolidation correct. start_date and end_date correct.
- Current/most recent position has more bullets than every former position.
- Every non-internship former position has exactly 3 bullets — checked individually for every entry, not just the 2nd.
- Every bullet follows the [action verb][process][result] formula, includes a specific plausible metric, no two bullets in the same position share the same sentence template, and no bullet reuses distinctive JD verbs like "leverage" or "harden".
- Header title and current position title reflect the target role's terminology without inflating seniority.
- No absolute/unfalsifiable claims ("zero data loss", "100% uptime", "no incidents", "no downtime").
- For each real, identifiable company, bullets/portfolio_projects/leadership entries reference that company's actual product or industry.
- Portfolio project and leadership descriptions each open with a distinct ACTION VERB BANK verb not reused from that company's career_breakdowns bullets, and do NOT reuse a metric/number already used in that company's career_breakdowns bullets.
- No bold formatting (** markers) anywhere in the resume.
- Certifications section has between 1 and 3 entries, each with a real well-known issuer.
- Portfolio projects count is 4 or fewer.
- Leadership entries count is 3 or fewer; each role label matches the seniority of the candidate's real job_title at that company.
- The literal substrings "harden", "hardening", and "leverage" do NOT appear anywhere in the output.
- Education entries ordered most recent first.
- No em dashes anywhere.

If ANY condition fails, regenerate internally before returning output.
Return only fully compliant JSON.

Remember today's year is 2026.
"""
    }
  
    // Build resume schema object for JSON examples
    // Resume JSON schema example, hardcoded directly as a string (no Xano object construction).
    var $resume_schema {
      value = "{\"header\":{\"name\":\"[NAME IN CAPS]\",\"location\":\"[City, State]\",\"email\":\"[Gmail]\",\"phone\":\"[Phone #]\",\"linkedin\":{\"display\":\"in/[username]\",\"url\":\"https://www.linkedin.com/in/[username]\"}},\"career_breakdowns\":[{\"company\":\"[Current Company]\",\"title\":\"[Current Position]\",\"date_range\":\"[Mon YYYY - Present]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]},{\"company\":\"[Former Company]\",\"title\":\"[Former Position]\",\"date_range\":\"[Mon YYYY - Mon YYYY]\",\"location\":\"[City, State]\",\"bullets\":[\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\",\"[Action verb + process + result, metric]\"]}],\"education\":[{\"institution\":\"[University]\",\"degree\":\"[DEGREE IN CAPS]\",\"location\":\"[City, State]\",\"major\":\"[Major]\",\"highlights\":\"[Accolades, extracurriculars]\",\"Relevant\":\"[Relevant coursework]\"}],\"certifications\":[{\"name\":\"[Cert Name]\",\"issuer\":\"[Issuer]\",\"date\":\"[Year]\"}],\"portfolio_projects\":[{\"name\":\"[Project Name] ([Technologies])\",\"date\":\"[End Date]\",\"description\":\"[Action verb + process + result]\"}],\"leadership_enterpreneurial_experience\":[{\"name\":\"[Initiative Name]\",\"role\":\"[Role]\",\"date\":\"[End Date]\",\"description\":\"[Responsibilities and results]\"}],\"technical_skills\":{\"programming\":\"xxx, xxx\",\"softwares\":\"xxx, xxx\",\"statistics_and_ml\":\"xxx, xxx\",\"project_management\":\"xxx, xxx\",\"languages\":\"xxx, xxx\"}}"
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
  
    try_catch {
      try {
        api.request {
          url = "https://api.anthropic.com/v1/messages"
          method = "POST"
          params = {}
            |set:"model":"claude-haiku-4-5"
            |set:"max_tokens":6000
            |set:"system":([]
              |push:({}
                |set:"type":"text"
                |set:"text":$system_prompt
                |set:"cache_control":({}|set:"type":"ephemeral")
              )
            )
            |set:"messages":([]
              |push:({}
                |set:"role":"user"
                |set:"content":"Generate a full tailored resume only.\n\nCANDIDATE PROFILE:\n\nFull Name: " ~ $prof.full_name ~ "\nEmail: " ~ $prof.email ~ "\nPhone: " ~ $prof.phone_number ~ "\nLocation: " ~ $prof.location ~ "\nLinkedIn: " ~ $prof.linkedin_url ~ "\nGitHub: " ~ $prof.github_url ~ "\nTarget Category: " ~ $prof.job_category ~ "\n\nWORK EXPERIENCE:\n" ~ $work_text ~ "\nEDUCATION:\n" ~ $edu_text ~ "\nJOB DESCRIPTION:\n" ~ ($input.job_description) ~ "\n\nReturn EXACTLY this JSON structure:\n\n" ~ $resume_schema ~ "\n\nReturn only JSON. No explanations. No markdown. No additional text."
              )
            )
          headers = []
            |push:"Content-Type: application/json"
            |push:$claude_auth
            |push:"anthropic-version: 2023-06-01"
          timeout = 300
        } as $ai_resp
      
        var.update $response_text {
          value = $ai_resp.response.result.content|first|get:"text"
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
            // Second attempt: remove last character (common extra trailing brace issue)
            var $trimmed_response {
              value = $clean_response|regex_replace:".$":""|trim
            }
          
            try_catch {
              try {
                var.update $parsed_response {
                  value = $trimmed_response|json_decode
                }
              }
            
              catch {
                // JSON is truly invalid — $parsed_response stays null, handled below
                debug.log {
                  value = "JSON parse failed after second attempt: " ~ $error
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
          }
        
          else {
            var.update $match_status {
              value = 1
            }
          
            var.update $resume_text {
              value = $parsed_response|json_encode
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
      value = $ai_resp.response.result.usage|get:"input_tokens"
    }
  
    var.update $output_tokens {
      value = $ai_resp.response.result.usage|get:"output_tokens"
    }

    var.update $cache_creation_input_tokens {
      value = $ai_resp.response.result.usage
        |get:"cache_creation_input_tokens"
        |first_notnull:0
    }

    var.update $cache_read_input_tokens {
      value = $ai_resp.response.result.usage
        |get:"cache_read_input_tokens"
        |first_notnull:0
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
  }

  response = {
    match_status   : $match_status
    error_msg      : $error_msg
    resume_text    : $resume_text
    resume_filename: $resume_filename
  }
  guid = "hAnQgUuQRN0X-UuBt8keYNolcJ8"
}