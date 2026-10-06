// Validates and normalizes a list of IP whitelist entries (IPv4 or IPv6, no CIDR).
// Normalization: trim, strip "::ffff:", lower-case; blank entries are dropped; duplicates removed.
// Returns {entries: text[], invalid_entry: text|null, too_many: bool}. Max 50 raw entries.
function "security/normalize_ip_list" {
  description = "Validate, trim, strip ::ffff:, de-duplicate an IP list"

  input {
    text[] ips?
  }

  stack {
    var $raw {
      value = []
    }

    conditional {
      if ($input.ips != null) {
        var.update $raw {
          value = $input.ips
        }
      }
    }

    var $entries {
      value = []
    }

    var $invalid {
      value = null
    }

    var $too_many {
      value = ($raw|count) > 50
    }

    var $v4 {
      value = "/^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/"
    }

    var $v6 {
      value = "/^(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::(([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?)$/"
    }

    conditional {
      if (!$too_many) {
        foreach ($raw) {
          each as $item {
            var $e {
              value = ((($item|to_text)|trim)|replace:"::ffff:":"")|to_lower
            }

            conditional {
              if ($e != "") {
                var $ok {
                  value = ($v4|regex_matches:$e) || ($v6|regex_matches:$e)
                }

                conditional {
                  if ($ok && ($e|contains:":") && (($e|split:":")|count) > 8) {
                    var.update $ok {
                      value = false
                    }
                  }
                }

                conditional {
                  if (!$ok && $invalid == null) {
                    var.update $invalid {
                      value = ($item|to_text)|trim
                    }
                  }
                }

                conditional {
                  if ($ok && (($entries|filter:$$ == $e)|count) == 0) {
                    array.push $entries {
                      value = $e
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

  response = {entries: $entries, invalid_entry: $invalid, too_many: $too_many}
  guid = "ZXq8RP_L0VAKHAwvBiemFVc5QdQ"
}
