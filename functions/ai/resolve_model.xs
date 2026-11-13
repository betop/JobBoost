// Validates the model a user picked in the extension and returns the Anthropic model id to call.
// Only models that are live on the Anthropic API and offered in the extension are selectable:
// Claude Haiku 4.5 (default), Claude Haiku 5.5 and Claude Sonnet 5.5.
// Haiku 4.5 does not support output_config.effort, so the resume/chat calls omit it for 4.5.
// Anything else (empty, unknown, retired) falls back to the default, Haiku 4.5.
// Claude 3.5 Haiku is also priced but NOT selectable: Anthropic retired
// claude-3-5-haiku-20241022 on 2026-02-19, so calling it would fail.
// Keep $allowed in sync with credits/get_usage_rate ($allowed_models).
function "ai/resolve_model" {
  description = "Map the requested ai_model to a selectable Anthropic model id (default Haiku 4.5)"

  input {
    text ai_model?
  }

  stack {
    var $allowed {
      value = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-haiku-4-5"]
    }

    var $model {
      value = "claude-haiku-4-5"
    }

    foreach ($allowed) {
      each as $a {
        conditional {
          if ($input.ai_model == $a) {
            var.update $model {
              value = $a
            }
          }
        }
      }
    }
  }

  response = $model

  guid = "Rm4ResolveQ7wNcT2pLsY9kBd6eXh"
}
