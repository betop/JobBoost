// Deterministically overwrite the contact fields of a generated resume header with the
// profile record (source of truth). The AI sometimes omits or garbles phone / LinkedIn /
// email / location, so this runs after the AI JSON is parsed and before it is stored.
// Only fields that have a non-blank value in the profile are set; otherwise the AI value
// is left untouched. Never throws: on any problem the original resume is returned.
function "resume/apply_profile_header" {
  description = "Overwrite resume header name/email/phone/location/linkedin from the profile record"

  input {
    json resume? {
      description = "Parsed resume object produced by the AI"
    }

    json profile? {
      description = "Profile record (full_name, email, phone_number, location, linkedin_url)"
    }
  }

  stack {
    var $result {
      value = $input.resume
    }

    try_catch {
      try {
        var $p {
          value = $input.profile
        }

        var $resume_is_object {
          value = $input.resume != null && (($input.resume|json_encode)|substr:0:1) == "{"
        }

        conditional {
          if ($resume_is_object && $p != null) {
            var $fields {
              value = {}
            }

            var $name {
              value = $p|get:"full_name":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($name != "") {
                var.update $fields {
                  value = $fields|set:"name":($name|to_upper)
                }
              }
            }

            var $email {
              value = $p|get:"email":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($email != "") {
                var.update $fields {
                  value = $fields|set:"email":$email
                }
              }
            }

            var $phone {
              value = $p|get:"phone_number":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($phone != "") {
                var.update $fields {
                  value = $fields|set:"phone":$phone
                }
              }
            }

            var $location {
              value = $p|get:"location":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($location != "") {
                var.update $fields {
                  value = $fields|set:"location":$location
                }
              }
            }

            var $li_raw {
              value = $p|get:"linkedin_url":null|first_notnull:""|to_text|trim
            }

            conditional {
              if ($li_raw != "") {
                // display = url without scheme / www. / query / trailing slash / linkedin.com/ prefix
                var $li_display {
                  value = $li_raw
                    |regex_replace:"(?i)^https?://":""
                    |regex_replace:"(?i)^www[.]":""
                    |regex_replace:"[?#].*$":""
                    |regex_replace:"/+$":""
                    |regex_replace:"(?i)^linkedin[.]com/":""
                    |trim
                }

                var $li_url {
                  value = (($li_raw|to_lower)|substr:0:4) == "http" ? $li_raw : ("https://" ~ ($li_raw|regex_replace:"^/+":""))
                }

                conditional {
                  if ($li_display != "") {
                    var.update $fields {
                      value = $fields|set:"linkedin":({}|set:"display":$li_display|set:"url":$li_url)
                    }
                  }
                }
              }
            }

            var $header {
              value = {}
            }

            var $existing_header {
              value = $input.resume|get:"header":null
            }

            conditional {
              if ($existing_header != null && (($existing_header|json_encode)|substr:0:1) == "{") {
                var.update $header {
                  value = $existing_header
                }
              }
            }

            var $out {
              value = $input.resume
            }

            foreach (["name", "email", "phone", "location", "linkedin"]) {
              each as $key {
                var $val {
                  value = $fields|get:$key:null
                }

                conditional {
                  if ($val != null) {
                    var.update $header {
                      value = $header|set:$key:$val
                    }

                    // The PDF generator flattens header into the root with root keys winning,
                    // so a stray/garbled root-level copy must be overwritten too.
                    conditional {
                      if (($out|get:$key:null) != null) {
                        var.update $out {
                          value = $out|set:$key:$val
                        }
                      }
                    }
                  }
                }
              }
            }

            // Only add/replace the header when the profile contributed something
            conditional {
              if (($fields|json_encode) != "{}") {
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
          value = "apply_profile_header failed, keeping AI header: " ~ $error
        }
      }
    }
  }

  response = $result
  guid = "nVUuVk6idIaGTDmU_qWz6euZXPs"
}
