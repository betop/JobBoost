// Single source of truth for Claude Haiku 4.5 list prices (USD per 1M tokens).
// Used by ai/claude_haiku_cost and the credits usage-summary endpoint.
// If prices change, update here (and admin-panel/src/utils/aiPricing.ts, api/dashboard/dashboard/usage_pricing_POST.xs).
function "ai/claude_haiku_rates" {
  description = "Claude Haiku 4.5 prices per 1M tokens (input, output, cache write, cache read)"

  input {
  }

  stack {
    var $rates {
      value = {input_per_million: 1.0, output_per_million: 5.0, cache_write_per_million: 1.25, cache_read_per_million: 0.1}
    }
  }

  response = $rates

  guid = "Hr8RatesQ3vNcT6pLwY2kBd5eXaM"
}
