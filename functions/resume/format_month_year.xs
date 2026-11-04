// Normalize a single resume date or a date range to "Mon YYYY" (never a day).
// Ranges are split on " - ", " – ", " — ", " to " and a bare en/em dash, each side is
// formatted and the parts are rejoined with " - ". "Present"/"Current"/"Now" -> "Present".
// Bare years and unrecognized text are returned trimmed and unchanged. Never throws.
function "resume/format_month_year" {
  description = "Format a date or date range as 'Mon YYYY' (or 'Mon YYYY - Mon YYYY'), dropping any day"

  input {
    text value? {
      description = "Raw date or date range text produced by the AI or stored in the database"
    }
  }

  stack {
    var $raw {
      value = $input.value|first_notnull:""|to_text|trim
    }

    var $result {
      value = $raw
    }

    try_catch {
      try {
        var $month_abbr {
          value = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        }

        var $month_names {
          value = {
            jan: "Jan"
            feb: "Feb"
            mar: "Mar"
            apr: "Apr"
            may: "May"
            jun: "Jun"
            jul: "Jul"
            aug: "Aug"
            sep: "Sep"
            oct: "Oct"
            nov: "Nov"
            dec: "Dec"
          }
        }

        // Range separators become "|" (a plain hyphen only counts when surrounded by spaces,
        // so ISO dates like 2025-01-01 are never split)
        var $marked {
          value = "/\\s+(?:-|to)\\s+|\\s*(?:–|—)\\s*/i"|regex_replace:"|":$raw
        }

        var $parts {
          value = $marked|split:"|"
        }

        var $formatted_parts {
          value = []
        }

        foreach ($parts) {
          each as $part {
            var $s {
              value = $part|first_notnull:""|to_text|trim
            }

            var $s_lower {
              value = $s|to_lower
            }

            var $out_part {
              value = $s
            }

            // "YYYY-MM-DD", "YYYY-MM-DDTHH...", "YYYY-MM", "YYYY/MM"
            var $m_iso {
              value = "/^(\\d{4})[-\\/](\\d{1,2})(?:[-\\/]\\d{1,2})?(?:[T\\s].*)?$/"|regex_get_first_match:$s
            }

            // "MM-DD-YYYY", "MM/DD/YYYY", "MM.DD.YYYY"
            var $m_mdy {
              value = "/^(\\d{1,2})[-\\/.](\\d{1,2})[-\\/.](\\d{4})$/"|regex_get_first_match:$s
            }

            // "MM/YYYY", "MM-YYYY"
            var $m_my {
              value = "/^(\\d{1,2})[-\\/.](\\d{4})$/"|regex_get_first_match:$s
            }

            // "January 15, 2025", "Jan 15 2025", "January 2025", "Sept. 2025"
            var $m_named {
              value = "/^([A-Za-z]{3,})\\.?,?\\s+(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?(\\d{4})$/"|regex_get_first_match:$s
            }

            // "15 January 2025", "15th Jan, 2025"
            var $m_day_first {
              value = "/^\\d{1,2}(?:st|nd|rd|th)?\\s+([A-Za-z]{3,})\\.?,?\\s+(\\d{4})$/"|regex_get_first_match:$s
            }

            conditional {
              if ($s == "") {
                var.update $out_part {
                  value = ""
                }
              }

              elseif ($s_lower == "present" || $s_lower == "current" || $s_lower == "now") {
                var.update $out_part {
                  value = "Present"
                }
              }

              elseif ($m_iso != null && ($m_iso|count) > 2) {
                var $iso_month {
                  value = ($m_iso|get:2)|to_int
                }

                conditional {
                  if ($iso_month >= 1 && $iso_month <= 12) {
                    var.update $out_part {
                      value = ($month_abbr|get:($iso_month - 1)) ~ " " ~ ($m_iso|get:1)
                    }
                  }

                  else {
                    var.update $out_part {
                      value = $m_iso|get:1
                    }
                  }
                }
              }

              elseif ($m_mdy != null && ($m_mdy|count) > 3) {
                var $mdy_month {
                  value = ($m_mdy|get:1)|to_int
                }

                conditional {
                  if ($mdy_month >= 1 && $mdy_month <= 12) {
                    var.update $out_part {
                      value = ($month_abbr|get:($mdy_month - 1)) ~ " " ~ ($m_mdy|get:3)
                    }
                  }

                  else {
                    var.update $out_part {
                      value = $m_mdy|get:3
                    }
                  }
                }
              }

              elseif ($m_my != null && ($m_my|count) > 2) {
                var $my_month {
                  value = ($m_my|get:1)|to_int
                }

                conditional {
                  if ($my_month >= 1 && $my_month <= 12) {
                    var.update $out_part {
                      value = ($month_abbr|get:($my_month - 1)) ~ " " ~ ($m_my|get:2)
                    }
                  }

                  else {
                    var.update $out_part {
                      value = $m_my|get:2
                    }
                  }
                }
              }

              elseif ($m_named != null && ($m_named|count) > 2) {
                var $named_key {
                  value = ($m_named|get:1)|to_lower|substr:0:3
                }

                var $named_mon {
                  value = $month_names|get:$named_key:null
                }

                // Only rewrite when the word really is a month (e.g. not "Summer 2025")
                conditional {
                  if ($named_mon != null) {
                    var.update $out_part {
                      value = $named_mon ~ " " ~ ($m_named|get:2)
                    }
                  }
                }
              }

              elseif ($m_day_first != null && ($m_day_first|count) > 2) {
                var $day_first_key {
                  value = ($m_day_first|get:1)|to_lower|substr:0:3
                }

                var $day_first_mon {
                  value = $month_names|get:$day_first_key:null
                }

                conditional {
                  if ($day_first_mon != null) {
                    var.update $out_part {
                      value = $day_first_mon ~ " " ~ ($m_day_first|get:2)
                    }
                  }
                }
              }
            }

            conditional {
              if ($out_part != "") {
                array.push $formatted_parts {
                  value = $out_part
                }
              }
            }
          }
        }

        var.update $result {
          value = $formatted_parts|join:" - "
        }
      }

      catch {
        debug.log {
          value = "format_month_year failed, keeping raw date: " ~ $error
        }

        var.update $result {
          value = $raw
        }
      }
    }
  }

  response = $result
  guid = "ZPVwWckKSYVkfO9n2HeNn2Qph0I"
}
