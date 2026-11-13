// JSON schema for the resume generation reply (Anthropic structured outputs, output_config.format).
// Mirrors the $resume_schema / $result_schema example the prompt shows in generate_POST / regenerate_POST:
// {resume: {header, summary?, career_breakdowns?, education?, certifications?, portfolio_projects?,
// leadership_enterpreneurial_experience?, technical_skills?}, cover_letter?}.
// Structured-output rules: every object has additionalProperties=false and lists ALL its properties
// in required; no length / count / range constraints.
function "resume/output_schema" {
  description = "Build the structured-output JSON schema for the resume (and optional cover letter) reply"

  input {
    bool include_cover_letter?=true {
      description = "Add a top-level cover_letter string"
    }

    bool summary?=false {
      description = "Add resume.summary"
    }

    bool headline?=false {
      description = "Add resume.header.title"
    }

    bool work_experience?=true {
      description = "Add resume.career_breakdowns"
    }

    bool education?=true {
      description = "Add resume.education"
    }

    bool certifications?=true {
      description = "Add resume.certifications"
    }

    bool portfolio_projects?=true {
      description = "Add resume.portfolio_projects"
    }

    bool leadership?=true {
      description = "Add resume.leadership_enterpreneurial_experience"
    }

    bool technical_skills?=true {
      description = "Add resume.technical_skills"
    }
  }

  stack {
    var $str {
      value = {}|set:"type":"string"
    }

    var $str_array {
      value = {}|set:"type":"array"|set:"items":$str
    }

    // ---------- header ----------
    var $linkedin_schema {
      value = {}
        |set:"type":"object"
        |set:"properties":({}|set:"display":$str|set:"url":$str)
        |set:"required":["display", "url"]
        |set:"additionalProperties":false
    }

    var $header_props {
      value = {}
        |set:"name":$str
        |set:"location":$str
        |set:"email":$str
        |set:"phone":$str
        |set:"linkedin":$linkedin_schema
    }

    var $header_required {
      value = ["name", "location", "email", "phone", "linkedin"]
    }

    conditional {
      if ($input.headline) {
        var.update $header_props {
          value = $header_props|set:"title":$str
        }

        array.push $header_required {
          value = "title"
        }
      }
    }

    var $header_schema {
      value = {}
        |set:"type":"object"
        |set:"properties":$header_props
        |set:"required":$header_required
        |set:"additionalProperties":false
    }

    // ---------- resume ----------
    var $resume_props {
      value = {}|set:"header":$header_schema
    }

    var $resume_required {
      value = ["header"]
    }

    conditional {
      if ($input.summary) {
        var.update $resume_props {
          value = $resume_props|set:"summary":$str
        }

        array.push $resume_required {
          value = "summary"
        }
      }
    }

    conditional {
      if ($input.work_experience) {
        var $career_item {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"company":$str|set:"title":$str|set:"date_range":$str|set:"location":$str|set:"bullets":$str_array)
            |set:"required":["company", "title", "date_range", "location", "bullets"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"career_breakdowns":({}|set:"type":"array"|set:"items":$career_item)
        }

        array.push $resume_required {
          value = "career_breakdowns"
        }
      }
    }

    conditional {
      if ($input.education) {
        var $education_item {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"institution":$str|set:"degree":$str|set:"location":$str|set:"year":$str|set:"major":$str|set:"highlights":$str|set:"Relevant":$str)
            |set:"required":["institution", "degree", "location", "year", "major", "highlights", "Relevant"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"education":({}|set:"type":"array"|set:"items":$education_item)
        }

        array.push $resume_required {
          value = "education"
        }
      }
    }

    conditional {
      if ($input.certifications) {
        var $cert_item {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"name":$str|set:"issuer":$str)
            |set:"required":["name", "issuer"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"certifications":({}|set:"type":"array"|set:"items":$cert_item)
        }

        array.push $resume_required {
          value = "certifications"
        }
      }
    }

    conditional {
      if ($input.portfolio_projects) {
        var $project_item {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"name":$str|set:"description":$str)
            |set:"required":["name", "description"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"portfolio_projects":({}|set:"type":"array"|set:"items":$project_item)
        }

        array.push $resume_required {
          value = "portfolio_projects"
        }
      }
    }

    conditional {
      if ($input.leadership) {
        var $leadership_item {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"name":$str|set:"role":$str|set:"description":$str)
            |set:"required":["name", "role", "description"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"leadership_enterpreneurial_experience":({}|set:"type":"array"|set:"items":$leadership_item)
        }

        array.push $resume_required {
          value = "leadership_enterpreneurial_experience"
        }
      }
    }

    conditional {
      if ($input.technical_skills) {
        var $skills_schema {
          value = {}
            |set:"type":"object"
            |set:"properties":({}|set:"programming":$str|set:"softwares":$str|set:"statistics_and_ml":$str|set:"project_management":$str)
            |set:"required":["programming", "softwares", "statistics_and_ml", "project_management"]
            |set:"additionalProperties":false
        }

        var.update $resume_props {
          value = $resume_props|set:"technical_skills":$skills_schema
        }

        array.push $resume_required {
          value = "technical_skills"
        }
      }
    }

    var $resume_schema {
      value = {}
        |set:"type":"object"
        |set:"properties":$resume_props
        |set:"required":$resume_required
        |set:"additionalProperties":false
    }

    // ---------- top level ----------
    var $top_props {
      value = {}|set:"resume":$resume_schema
    }

    var $top_required {
      value = ["resume"]
    }

    conditional {
      if ($input.include_cover_letter) {
        var.update $top_props {
          value = $top_props|set:"cover_letter":$str
        }

        array.push $top_required {
          value = "cover_letter"
        }
      }
    }

    var $schema {
      value = {}
        |set:"type":"object"
        |set:"properties":$top_props
        |set:"required":$top_required
        |set:"additionalProperties":false
    }
  }

  response = $schema
  guid = "7-AzX4O3aCkGydyNc2nf8uhqks0"
}
