// Single-row table holding global billing settings (usage multiplier applied to raw AI cost).
table billing_setting {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    decimal usage_rate?=1.5
  }

  index = [{type: "primary", field: [{name: "id"}]}]
  guid = "bS7rTq2LmX9vKdN4pWcYe1hJaZo"
}
