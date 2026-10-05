// Returns the real client IP of the current request, normalized (trimmed, "::ffff:" stripped).
//
// Why: the API runs behind a load balancer / ingress, so $env.$remote_ip is the internal proxy
// address (e.g. 10.0.81.93), never the client. The proxy appends the address it saw to the
// X-Forwarded-For header, e.g. "X-Forwarded-For: 38.23.34.57, 10.0.81.93" where 38.23.34.57 is the
// client and 10.0.81.93 is the internal hop.
//
// Anti-spoofing: a client can send its own X-Forwarded-For, which the proxy then extends, so the
// LEADING entries are attacker-controlled and must not be trusted. Only entries appended by our own
// infrastructure are trustworthy. With the observed topology the last entry is the internal hop and
// the entry before it is the address the trusted last hop saw as the TCP peer, i.e. the real client.
// Rule: 2+ entries -> SECOND-TO-LAST entry; exactly 1 entry -> that entry; header missing/empty ->
// fall back to $env.$remote_ip.
//
// $http_headers is read as an array of "Name: value" strings (also tolerates an object); header
// names are matched case-insensitively.
function "security/get_client_ip" {
  description = "Real client IP from X-Forwarded-For (second-to-last entry), normalized; falls back to remote_ip"

  input {
  }

  stack {
    var $xff_raw {
      value = ""
    }

    var $headers {
      value = $env.$http_headers
    }

    conditional {
      if ($headers|is_array) {
        foreach ($headers) {
          each as $h {
            var $h_text {
              value = ($h|to_text)|trim
            }

            conditional {
              if (($h_text|to_lower|starts_with:"x-forwarded-for:") && $xff_raw == "") {
                var.update $xff_raw {
                  value = ($h_text|substr:16)|trim
                }
              }
            }
          }
        }
      }
      elseif ($headers|is_object) {
        foreach ($headers|entries) {
          each as $e {
            conditional {
              if ((($e.key|to_text)|to_lower) == "x-forwarded-for" && $xff_raw == "") {
                var.update $xff_raw {
                  value = (($e.value|to_text)|trim)
                }
              }
            }
          }
        }
      }
    }

    var $parts {
      value = $xff_raw|split:","|map:(($$|trim)|replace:"::ffff:":"")|filter:$$ != ""
    }

    var $n {
      value = $parts|count
    }

    var $client_ip {
      value = (($env.$remote_ip|to_text)|trim)|replace:"::ffff:":""
    }

    conditional {
      if ($n >= 2) {
        var.update $client_ip {
          value = $parts|get:($n - 2)
        }
      }
      elseif ($n == 1) {
        var.update $client_ip {
          value = $parts|first
        }
      }
    }
  }

  response = $client_ip
  guid = "cfMU57wuX_82yg2mqLA3Q0eCMbs"
}
