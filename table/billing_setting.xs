// Single-row table holding global billing settings (usage multiplier applied to raw AI cost).
table billing_setting {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    decimal usage_rate?=1.5

    // Per-model multiplier overrides: object of model id -> rate (e.g. {"claude-haiku-5-5": 2.5}).
    // Models missing from the map use usage_rate.
    json model_rates?
  }

  index = [{type: "primary", field: [{name: "id"}]}]
  guid = "bS7rTq2LmX9vKdN4pWcYe1hJaZo"
}
