workflow_test "model_pricing" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }

    // Same tokens for every model: 1000 in, 500 out, 200 cache write (1h), 3000 cache read
    // Haiku 4.5: (1000*1 + 500*5 + 200*2 + 3000*0.1) / 1e6 = 0.0042
    function.call "ai/claude_haiku_cost" { input = {model: "claude-haiku-4-5", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $c45
    expect.to_equal ($c45) { value = 0.0042 }

    // Empty / unknown model falls back to Haiku 4.5
    function.call "ai/claude_haiku_cost" { input = {input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $cdef
    expect.to_equal ($cdef) { value = 0.0042 }

    // Haiku 5.5 (<=100K prompt): (1000*0.1 + 500*0.5 + 200*0.2 + 3000*0.01) / 1e6 = 0.00042
    function.call "ai/claude_haiku_cost" { input = {model: "claude-haiku-5-5", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $c55
    expect.to_equal ($c55) { value = 0.00042 }

    // Haiku 5.5 (>100K prompt = 100000 + 3000 + 200 = 103200): (100000*0.5 + 500*2.5 + 200*1 + 3000*0.05) / 1e6 = 0.0516
    function.call "ai/claude_haiku_cost" { input = {model: "claude-haiku-5-5", input_tokens: 100000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $c55big
    expect.to_equal ($c55big) { value = 0.0516 }

    // Haiku 3.5: (1000*0.8 + 500*4 + 200*1.6 + 3000*0.08) / 1e6 = 0.00336
    function.call "ai/claude_haiku_cost" { input = {model: "claude-3-5-haiku-20241022", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $c35
    expect.to_equal ($c35) { value = 0.00336 }

    // Only the two live models are selectable; retired / unknown / empty -> Haiku 4.5
    function.call "ai/resolve_model" { input = {ai_model: "claude-haiku-5-5"} } as $m55
    expect.to_equal ($m55) { value = "claude-haiku-5-5" }
    function.call "ai/resolve_model" { input = {ai_model: "claude-3-5-haiku-20241022"} } as $m35
    expect.to_equal ($m35) { value = "claude-haiku-4-5" }
    function.call "ai/resolve_model" { input = {ai_model: "gpt-4"} } as $mbad
    expect.to_equal ($mbad) { value = "claude-haiku-4-5" }
    function.call "ai/resolve_model" { input = {} } as $mnone
    expect.to_equal ($mnone) { value = "claude-haiku-4-5" }

    // Charge = raw cost x price rate; a personal rate on the billing admin wins over the global one
    db.add users { data = {full_name: "MPA", email: "mpa" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil, usage_rate: 2} } as $adm
    db.add users { data = {full_name: "MPB", email: "mpb" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $adm2
    function.call "credits/get_usage_rate" { input = {admin_id: $adm.id} } as $r1
    expect.to_equal ($r1.usage_rate) { value = 2 }
    expect.to_be_true ($r1.is_custom)
    function.call "credits/get_usage_rate" { input = {admin_id: $adm2.id} } as $r2
    expect.to_equal ($r2.is_custom) { value = false }

    // Haiku 5.5 charged at the admin's personal rate 2x: 0.00042 * 2 = 0.00084
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, model: "claude-haiku-5-5", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000, related_log_table: "generation_log", related_log_id: $nil} } as $ch
    expect.to_equal ($ch.charged) { value = 0.00084 }
    expect.to_equal ($ch.usage_rate) { value = 2 }
    expect.to_equal ($ch.raw_cost_usd) { value = 0.00042 }

    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id
      return = {type: "list"}
    } as $txns
    expect.to_equal ($txns[0].ai_model) { value = "claude-haiku-5-5" }
  }
  guid = "Mp9ModelPricingTestQ6wXz4Lr"
}
