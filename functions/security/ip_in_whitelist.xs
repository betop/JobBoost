// Decides whether a client IP is permitted by a key's IP whitelist.
// Rule: if the whitelist (after normalization) is empty/null/blank-only -> allowed (no restriction).
// Otherwise the normalized client IP must equal one of the normalized entries.
// Normalization: trim, strip "::ffff:", lower-case (IPv6 hex is case-insensitive).
function "security/ip_in_whitelist" {
  description = "True when the whitelist is empty or contains the (normalized) ip"

  input {
    text ip?
    text[] allowed_ips?
  }

  stack {
    var $list {
      value = []
    }

    conditional {
      if ($input.allowed_ips != null) {
        var.update $list {
          value = $input.allowed_ips
        }
      }
    }

    var $normalized {
      value = $list|map:((($$|to_text)|trim)|replace:"::ffff:":""|to_lower)|filter:$$ != ""
    }

    var $client {
      value = ((($input.ip|to_text)|trim)|replace:"::ffff:":"")|to_lower
    }

    var $allowed {
      value = true
    }

    conditional {
      if (($normalized|count) > 0) {
        var.update $allowed {
          value = (($normalized|filter:$$ == $client)|count) > 0
        }
      }
    }
  }

  response = $allowed
  guid = "cmEIcWXSs5RH3sYRRk8b4PfFxTM"
}
