// Single source of truth for the raw provider cost (USD) of one Claude Haiku 4.5 call.
// List prices per 1M tokens (https://platform.claude.com/docs/en/about-claude/pricing):
//   input $1.00 | output $5.00 | 5-minute cache write $1.25 (1.25x input) | cache read $0.10 (0.1x input)
// Anthropic reports input_tokens EXCLUDING cached tokens, so the four buckets never overlap
// and are simply summed. Used by resume generation, regeneration, the SwiftCV chat assistant.
// If the model or its prices change, update the rates here (and admin-panel/src/utils/aiPricing.ts,
// and api/dashboard/dashboard/usage_pricing_POST.xs).
function "ai/claude_haiku_cost" {
  description = "Raw USD cost of a Claude Haiku 4.5 call from its token usage"

  input {
    int input_tokens?=0 {
      description = "usage.input_tokens (uncached input)"
    }

    int output_tokens?=0 {
      description = "usage.output_tokens"
    }

    int cache_creation_tokens?=0 {
      description = "usage.cache_creation_input_tokens (billed at 1.25x input)"
    }

    int cache_read_tokens?=0 {
      description = "usage.cache_read_input_tokens (billed at 0.1x input)"
    }
  }

  stack {
    var $cost {
      value = ((($input.input_tokens|first_notnull:0) * 1.0) + (($input.output_tokens|first_notnull:0) * 5.0) + (($input.cache_creation_tokens|first_notnull:0) * 1.25) + (($input.cache_read_tokens|first_notnull:0) * 0.1)) / 1000000
    }
  }

  response = $cost

  guid = "Hk5CostQ8wLpV3nRcT7sYbE2aKfX"
}
