// Single source of truth for the raw provider cost (USD) of one Claude Haiku call (any model).
// Prices per 1M tokens live in ai/claude_haiku_rates (per model; cache writes at the 1-hour rate,
// Haiku 5.5 tiered at 100K prompt tokens). The formula is identical for every model:
//   input*input_price + output*output_price + cache_write*cache_write_price + cache_read*cache_read_price
// Anthropic reports input_tokens EXCLUDING cached tokens, so the four buckets never overlap
// and are simply summed. The price rate (multiplier) is applied by credits/credit_charge_usage.
// Used by resume generation, regeneration, the SwiftCV chat assistant.
function "ai/claude_haiku_cost" {
  description = "Raw USD cost of a Claude Haiku call from its model and token usage"

  input {
    text model? {
      description = "Anthropic model id; empty = claude-haiku-4-5"
    }

    int input_tokens?=0 {
      description = "usage.input_tokens (uncached input)"
    }

    int output_tokens?=0 {
      description = "usage.output_tokens"
    }

    int cache_creation_tokens?=0 {
      description = "usage.cache_creation_input_tokens (billed at the 1h cache-write price)"
    }

    int cache_read_tokens?=0 {
      description = "usage.cache_read_input_tokens (billed at the cache-read price)"
    }
  }

  stack {
    // Prompt size of the request selects the price tier (Haiku 5.5: >100K prompt tokens)
    var $prompt_tokens {
      value = ($input.input_tokens|first_notnull:0) + ($input.cache_creation_tokens|first_notnull:0) + ($input.cache_read_tokens|first_notnull:0)
    }

    function.run "ai/claude_haiku_rates" {
      input = {model: $input.model, prompt_tokens: $prompt_tokens}
    } as $rates

    var $cost {
      value = ((($input.input_tokens|first_notnull:0) * $rates.input_per_million) + (($input.output_tokens|first_notnull:0) * $rates.output_per_million) + (($input.cache_creation_tokens|first_notnull:0) * $rates.cache_write_per_million) + (($input.cache_read_tokens|first_notnull:0) * $rates.cache_read_per_million)) / 1000000
    }
  }

  response = $cost

  guid = "Hk5CostQ8wLpV3nRcT7sYbE2aKfX"
}
