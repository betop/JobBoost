workflow_test "log_usage_rate_formula" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "LOGRATE", email: "lograte" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $adm

    // Raw cost from the four buckets: (1000*1 + 500*5 + 200*1.25 + 3000*0.10) / 1e6 = 0.00405
    function.call "ai/claude_haiku_cost" { input = {input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $raw
    expect.to_equal ($raw) { value = 0.00405 }

    // Explicit rate 1.5 -> 0.006075 (the current setting is NOT consulted)
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, usage_rate: 1.5, input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000, related_log_table: "generation_log", related_log_id: $nil} } as $c1
    expect.to_equal ($c1.charged) { value = 0.006075 }
    expect.to_equal ($c1.raw_cost_usd) { value = 0.00405 }
    expect.to_equal ($c1.usage_rate) { value = 1.5 }

    // Explicit rate 2 -> 0.0081
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, usage_rate: 2, input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000, related_log_table: "generation_log", related_log_id: $nil} } as $c2
    expect.to_equal ($c2.charged) { value = 0.0081 }
    expect.to_equal ($c2.usage_rate) { value = 2 }

    // A caller-supplied raw_cost_usd is ignored when tokens are given (tokens are the single source of truth)
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, usage_rate: 2, raw_cost_usd: 99, input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000, related_log_table: "generation_log", related_log_id: $nil} } as $c3
    expect.to_equal ($c3.charged) { value = 0.0081 }

    // Legacy callers (raw cost, no tokens, no rate) still work at the configured rate
    function.call "credits/get_usage_rate" { input = {} } as $cur
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, raw_cost_usd: 0.004, related_log_table: "generation_log", related_log_id: $nil} } as $c4
    expect.to_equal ($c4.charged) { value = (0.004 * $cur.usage_rate)|round:8 }

    // The ledger rows store the same rate and tokens
    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id
      sort = {credit_transaction.created_at: "asc"}
      return = {type: "list"}
    } as $txns
    expect.to_equal ($txns|count) { value = 4 }
    expect.to_equal ($txns[0].usage_rate) { value = 1.5 }
    // ledger decimals keep 5 decimal places in the DB, so compare with that tolerance
    expect.to_be_true ((($txns[0].amount + 0.006075)|abs) < 0.00001)
    expect.to_equal ($txns[0].raw_cost_usd) { value = 0.00405 }
    expect.to_equal ($txns[0].input_tokens) { value = 1000 }
    expect.to_equal ($txns[0].output_tokens) { value = 500 }
    expect.to_equal ($txns[0].cache_creation_tokens) { value = 200 }
    expect.to_equal ($txns[0].cache_read_tokens) { value = 3000 }
    expect.to_equal ($txns[1].usage_rate) { value = 2 }
    expect.to_equal ($txns[1].amount) { value = -0.0081 }
    expect.to_equal ($txns[1].cache_read_tokens) { value = 3000 }

    // Log rows persist the new columns (nullable decimals/uuid)
    db.add generation_log { data = {profile_id: $nil, user_id: $nil, usage_rate: 2, charged_amount: 0.0081, billing_admin_id: $adm.id, input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: 200, cache_read_input_tokens: 3000} } as $gl
    db.add mail_triage_log { data = {gmail_email: "t@t.invalid", input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, usage_rate: 1.5, charged_amount: null} } as $ml
    db.get generation_log {
      field_name = "id"
      field_value = $gl.id
    } as $gl2
    db.get mail_triage_log {
      field_name = "id"
      field_value = $ml.id
    } as $ml2
    expect.to_equal ($gl2.usage_rate) { value = 2 }
    expect.to_equal ($gl2.charged_amount) { value = 0.0081 }
    expect.to_equal ($gl2.billing_admin_id) { value = $adm.id }
    expect.to_equal ($ml2.usage_rate) { value = 1.5 }
    expect.to_be_null ($ml2.charged_amount)
    expect.to_be_null ($ml2.billing_admin_id)
    db.del generation_log {
      field_name = "id"
      field_value = $gl.id
    }
    db.del mail_triage_log {
      field_name = "id"
      field_value = $ml.id
    }
  }
  guid = "Lu5LogUsageRateFormulaQ8mTc"
}
