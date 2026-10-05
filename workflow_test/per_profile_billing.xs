workflow_test "per_profile_billing" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }

    db.add users { data = {full_name: "SA", email: "sa" ~ $sfx ~ "@t.invalid", type: "super_admin", credit_balance: 0, created_by: $nil} } as $sa
    db.add users { data = {full_name: "ASTRO", email: "astro" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $astro
    db.add users { data = {full_name: "EDWIN_CREATOR", email: "edc" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 0, created_by: $nil} } as $edc
    db.add users { data = {full_name: "TAUSEEFA", email: "tau" ~ $sfx ~ "@t.invalid", type: "bidder", created_by: $edc.id} } as $tau
    db.add profile { data = {full_name: "EDWIN", created_by: $edc.id, billing_admin_id: $astro.id} } as $edwin

    // Check 1
    function.call "credits/resolve_profile_billing_admin" { input = {profile_id: $edwin.id, user_id: $tau.id} } as $c1
    expect.to_equal ($c1.billing_admin_id) { value = $astro.id }
    expect.to_be_true ($c1.is_billable)

    // Check 2
    function.call "credits/check_sufficient_balance" { input = {user_id: $tau.id, profile_id: $edwin.id} } as $c2
    expect.to_be_true ($c2.has_sufficient_balance)
    expect.to_be_false ($c2.low_balance)
    expect.to_equal ($c2.balance) { value = 15 }
    debug.log { value = {check1: $c1, check2: $c2} }

    // Check 3
    db.patch users {
      field_name = "id"
      field_value = $astro.id
      data = {credit_balance: 3}
    } as $_a
    function.call "credits/check_sufficient_balance" { input = {user_id: $tau.id, profile_id: $edwin.id} } as $c3a
    expect.to_be_true ($c3a.has_sufficient_balance)
    expect.to_be_true ($c3a.low_balance)
    expect.to_not_be_null ($c3a.warning_message)
    db.patch users {
      field_name = "id"
      field_value = $astro.id
      data = {credit_balance: 0}
    } as $_b
    function.call "credits/check_sufficient_balance" { input = {user_id: $tau.id, profile_id: $edwin.id} } as $c3b
    expect.to_be_false ($c3b.has_sufficient_balance)
    debug.log { value = {check3a: $c3a, check3b: $c3b} }

    // Check 4
    db.patch users {
      field_name = "id"
      field_value = $astro.id
      data = {credit_balance: 15}
    } as $_c
    function.call "credits/credit_charge_usage" { input = {admin_id: $astro.id, raw_cost_usd: 0.0043, allow_negative: true, related_log_table: "t", related_log_id: $nil} } as $c4
    debug.log { value = {check4: $c4} }
    expect.to_equal ($c4.charged) { value = 0.00645 }
    expect.to_equal ($c4.new_balance) { value = 14.99355 }
    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $astro.id
      return = {type: "list"}
    } as $txns
    expect.to_be_greater_than ($txns|count) { value = 0 }
    expect.to_be_less_than ($txns[0].amount) { value = 0 }
    expect.to_equal ($txns[0].amount) { value = -0.00645 }

    db.add billing_setting { data = {usage_rate: 2}} as $bs
    function.call "credits/credit_charge_usage" { input = {admin_id: $astro.id, raw_cost_usd: 0.0043, allow_negative: true, related_log_table: "t", related_log_id: $nil} } as $c4b
    debug.log { value = {check4b: $c4b} }
    expect.to_equal ($c4b.charged) { value = 0.0086 }
    db.del billing_setting {
      field_name = "id"
      field_value = $bs.id
    }

    // Check 5
    function.call "ai/claude_haiku_cost" { input = {input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 200, cache_read_tokens: 3000} } as $c5
    debug.log { value = {check5: $c5} }
    expect.to_equal ($c5) { value = 0.00405 }

    // Check 6
    db.add profile { data = {full_name: "LEGACY", created_by: $tau.id, billing_admin_id: $nil} } as $legacy
    function.call "credits/resolve_profile_billing_admin" { input = {profile_id: $legacy.id, user_id: $tau.id} } as $c6
    debug.log { value = {check6: $c6} }
    expect.to_equal ($c6.billing_admin_id) { value = $edc.id }
    expect.to_be_true ($c6.is_billable)
  }
  guid = "XELkIXUQ7_9glNXB1ASadSOAF30"
}
