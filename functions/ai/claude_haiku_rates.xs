// Single source of truth for Claude list prices (USD per 1M tokens), per model.
// Used by ai/claude_haiku_cost and the credits usage-summary endpoint.
// Cache writes are priced at the 1-HOUR rate: every request sets cache_control ttl "1h".
// Haiku 5.5 is tiered: requests with more than 100K prompt tokens
// (input + cache write + cache read) use the higher price column.
// Unknown or empty model falls back to Haiku 4.5.
// If prices change, update here (and admin-panel/src/utils/aiPricing.ts).
function "ai/claude_haiku_rates" {
  description = "Per-model prices per 1M tokens (input, output, 1h cache write, cache read)"

  input {
    text model? {
      description = "Anthropic model id, e.g. claude-haiku-4-5"
    }

    int prompt_tokens?=0 {
      description = "Total prompt tokens of the request (input + cache write + cache read); selects the Haiku 5.5 price tier"
    }
  }

  stack {
    var $m {
      value = $input.model|first_notnull:"claude-haiku-4-5"
    }

    // Haiku 4.5 (default)
    var $rates {
      value = {model: "claude-haiku-4-5", label: "Claude Haiku 4.5", input_per_million: 1.0, output_per_million: 5.0, cache_write_per_million: 2.0, cache_read_per_million: 0.1}
    }

    conditional {
      if ($m == "claude-haiku-5-5") {
        conditional {
          if (($input.prompt_tokens|first_notnull:0) > 100000) {
            var.update $rates {
              value = {model: "claude-haiku-5-5", label: "Claude Haiku 5.5", input_per_million: 0.5, output_per_million: 2.5, cache_write_per_million: 1.0, cache_read_per_million: 0.05}
            }
          }

          else {
            var.update $rates {
              value = {model: "claude-haiku-5-5", label: "Claude Haiku 5.5", input_per_million: 0.1, output_per_million: 0.5, cache_write_per_million: 0.2, cache_read_per_million: 0.01}
            }
          }
        }
      }

      elseif ($m == "claude-3-5-haiku-20241022") {
        var.update $rates {
          value = {model: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5", input_per_million: 0.8, output_per_million: 4.0, cache_write_per_million: 1.6, cache_read_per_million: 0.08}
        }
      }
    }
  }

  response = $rates

  guid = "Hr8RatesQ3vNcT6pLwY2kBd5eXaM"
}
