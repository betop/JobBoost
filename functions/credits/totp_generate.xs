// RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) built from XanoScript primitives:
// manual base32 decode -> hex key -> hex2bin -> hmac_sha1 -> dynamic truncation.
// Used to auto-verify NOWPayments payouts (their 2FA is a standard authenticator-app TOTP).
// Test vector: secret GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ at=59 -> 287082.
function "credits/totp_generate" {
  description = "Generate a 6-digit TOTP code from a base32 secret"

  input {
    text secret {
      description = "Base32 TOTP secret"
    }

    int at? {
      description = "Optional unix time in seconds (defaults to now)"
    }
  }

  stack {
    var $clean {
      value = $input.secret|to_upper|replace:" ":""|replace:"=":""|replace:"-":""
    }

    var $alphabet {
      value = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    }

    var $hexdigits {
      value = "0123456789abcdef"
    }

    // base32 decode into a hex string
    var $buf {
      value = 0
    }

    var $bits {
      value = 0
    }

    var $key_hex {
      value = ""
    }

    var $chars {
      value = $clean|split:""
    }

    foreach ($chars) {
      each as $ch {
        var $v {
          value = $alphabet|index:$ch
        }

        var.update $buf {
          value = ($buf * 32) + $v
        }

        var.update $bits {
          value = $bits + 5
        }

        conditional {
          if ($bits >= 8) {
            var $div {
              value = 2|pow:($bits - 8)|to_int
            }

            var $byte {
              value = ($buf / $div)|floor|to_int
            }

            var.update $buf {
              value = $buf - ($byte * $div)
            }

            var.update $bits {
              value = $bits - 8
            }

            var $byte_hex {
              value = ("0" ~ ($byte|to_text|dechex))|substr:-2
            }

            var.update $key_hex {
              value = $key_hex ~ $byte_hex
            }
          }
        }
      }
    }

    var $now_s {
      value = ($input.at != null) ? $input.at : (now|to_timestamp|divide:1000|floor|to_int)
    }

    var $counter {
      value = ($now_s / 30)|floor|to_int
    }

    var $counter_hex {
      value = ("0000000000000000" ~ ($counter|to_text|dechex))|substr:-16
    }

    var $key_bin {
      value = $key_hex|hex2bin
    }

    var $msg_bin {
      value = $counter_hex|hex2bin
    }

    var $mac {
      value = $msg_bin|hmac_sha1:$key_bin
    }

    var $offset {
      value = $hexdigits|index:($mac|substr:39:1)
    }

    var $trunc_hex {
      value = $mac|substr:($offset * 2):8
    }

    var $trunc_digits {
      value = $trunc_hex|split:""
    }

    var $num {
      value = 0
    }

    var $first {
      value = true
    }

    foreach ($trunc_digits) {
      each as $d {
        var $dv {
          value = $hexdigits|index:$d
        }

        conditional {
          if ($first) {
            // mask the top bit (0x7fffffff)
            conditional {
              if ($dv >= 8) {
                var.update $dv {
                  value = $dv - 8
                }
              }
            }

            var.update $first {
              value = false
            }
          }
        }

        var.update $num {
          value = ($num * 16) + $dv
        }
      }
    }

    var $code_int {
      value = $num % 1000000
    }

    var $code {
      value = ("000000" ~ ($code_int|to_text))|substr:-6
    }
  }

  response = $code
  guid = "3l5ny1-qcCtoy6s37FqN-xItr_A"
}
