workflow_test "model_usage_rate" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }

    // Set a global rate of 1.5 with per-model overrides (only Haiku 5.5 overridden).
    // The live billing_setting row is remembered and restored at the end.
    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $bs
    var $created_id { value = null }
    conditional {
      if ($bs != null) {
        db.patch billing_setting {
          field_name = "id"
          field_value = $bs.id
          data = {usage_rate: 1.5, model_rates: {"claude-haiku-5-5": 2.5}}
        } as $_p
      }
      else {
        db.add billing_setting { data = {usage_rate: 1.5, model_rates: {"claude-haiku-5-5": 2.5}} } as $_a
        var.update $created_id { value = $_a.id }
      }
    }

    // Stored model rate applies; model without a stored rate uses its built-in default (Haiku 4.5 = 1.3)
    function.call "credits/get_usage_rate" { input = {model: "claude-haiku-5-5"} } as $r55
    expect.to_equal ($r55.usage_rate) { value = 2.5 }
    function.call "credits/get_usage_rate" { input = {model: "claude-haiku-4-5"} } as $r45
    expect.to_equal ($r45.usage_rate) { value = 1.3 }
    function.call "credits/get_usage_rate" { input = {model: "unknown-model"} } as $runk
    expect.to_equal ($runk.usage_rate) { value = 1.5 }
    function.call "credits/get_usage_rate" { input = {} } as $rnone
    expect.to_equal ($rnone.usage_rate) { value = 1.5 }
    expect.to_equal ($rnone.model_rates|get:"claude-haiku-5-5") { value = 2.5 }
    expect.to_equal ($rnone.model_rates|get:"claude-haiku-4-5") { value = 1.3 }
    expect.to_be_false (($rnone.models|filter:($$.model == "claude-haiku-4-5")|first).is_set)
    expect.to_be_true (($rnone.models|filter:($$.model == "claude-haiku-5-5")|first).is_set)

    // A personal admin rate beats the model rate
    db.add users { data = {full_name: "MUR", email: "mur" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil, usage_rate: 2} } as $adm
    function.call "credits/get_usage_rate" { input = {admin_id: $adm.id, model: "claude-haiku-5-5"} } as $radm
    expect.to_equal ($radm.usage_rate) { value = 2 }
    expect.to_be_true ($radm.is_custom)

    // Admin without a personal rate gets the model rate when charged: 0.00042 * 2.5 = 0.00105
    db.add users { data = {full_name: "MUR2", email: "mur2" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $adm2
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm2.id, model: "claude-haiku-5-5", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000, related_log_table: "generation_log", related_log_id: $nil} } as $ch
    expect.to_equal ($ch.charged) { value = 0.00105 }

    // Per-call raw cost (extraction + generation priced separately) wins over the summed tokens
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm2.id, model: "claude-haiku-5-5", usage_rate: 2, call_raw_cost_usd: 0.001, input_tokens: 1000, output_tokens: 500, related_log_table: "generation_log", related_log_id: $nil} } as $ch2
    expect.to_equal ($ch2.raw_cost_usd) { value = 0.001 }
    expect.to_equal ($ch2.charged) { value = 0.002 }

    // No stored model rates: built-in defaults (Haiku 4.5 = 1.3, Haiku 5.5 = 5)
    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $bs2
    db.patch billing_setting {
      field_name = "id"
      field_value = $bs2.id
      data = {model_rates: {}}
    } as $_p2
    function.call "credits/get_usage_rate" { input = {model: "claude-haiku-5-5"} } as $d55
    expect.to_equal ($d55.usage_rate) { value = 5 }
    function.call "credits/get_usage_rate" { input = {model: "claude-haiku-4-5"} } as $d45
    expect.to_equal ($d45.usage_rate) { value = 1.3 }

    // Restore the live billing_setting row
    conditional {
      if ($bs != null) {
        db.patch billing_setting {
          field_name = "id"
          field_value = $bs.id
          data = {usage_rate: $bs.usage_rate, model_rates: $bs.model_rates}
        } as $_r
      }
      else {
        db.del billing_setting {
          field_name = "id"
          field_value = $created_id
        }
      }
    }
  }
}
