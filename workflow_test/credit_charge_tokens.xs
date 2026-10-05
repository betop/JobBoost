workflow_test "credit_charge_tokens" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "TOKT", email: "tokt" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $adm

    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, raw_cost_usd: 0.00405, related_log_table: "generation_log", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $r
    expect.to_equal ($r.charged) { value = 0.006075 }

    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id
      return = {type: "list"}
    } as $txns
    expect.to_equal ($txns|count) { value = 1 }
    expect.to_equal ($txns[0].input_tokens) { value = 1000 }
    expect.to_equal ($txns[0].output_tokens) { value = 500 }
    expect.to_equal ($txns[0].cache_creation_tokens) { value = 200 }
    expect.to_equal ($txns[0].cache_read_tokens) { value = 3000 }
    expect.to_equal ($txns[0].raw_cost_usd) { value = 0.00405 }
    expect.to_equal ($txns[0].usage_rate) { value = 1.5 }

    function.call "ai/claude_haiku_rates" { input = {} } as $rates
    expect.to_equal ($rates.cache_write_per_million) { value = 1.25 }
  }
  guid = "Tk7ChargeTokensTestQ4wXz2Lp"
}
